import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentSchedule } from "@/app/(admin)/admin/students/StudentSchedule";
import { StudentDetail } from "@/app/(admin)/admin/students/StudentDetail";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { graduationStudent } from "@/tests/fixtures/studentGraduation";
import type { AttendanceEvent } from "@/types/practiceAttendance";
import type { StudentPractice } from "@/types/student";

vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}));
const row: StudentPractice = {
  id: "slot",
  scheduledAt: "2026-10-17T15:00:00Z",
  durationMinutes: 60,
  instructor: "Instructor",
  status: "completada",
  attended: true,
  reason: null,
};
const event: AttendanceEvent = {
  id: "event",
  practiceSlotId: "slot",
  studentId: "student",
  instructorId: "instructor",
  cohortId: "cohort",
  scheduledAt: row.scheduledAt,
  durationMinutes: 60,
  actorId: "actor-admin",
  actorRole: "admin",
  createdAt: "2026-10-26T20:00:00Z",
  tipo: "correccion",
  previousAttended: true,
  newAttended: false,
  motivo: "Se revisó el registro original",
};
const changed = vi.fn();
const auditPath = (page = 1) => `/practice-slots/slot/attendance/events?page=${page}&pageSize=20`;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockImplementation(async (path) => {
    if (path === "/users?rol=admin") return [{ id: "actor-admin", nombreCompleto: "María Pérez" }];
    if (path === "/users?rol=instructor") return [];
    return { items: [event], page: 1, pageSize: 20, total: 1 };
  });
  vi.mocked(api.patch).mockResolvedValue({ id: "slot", attended: false });
});
function renderSchedule(attended: boolean | null = true) {
  render(
    <StudentSchedule
      schedule={{ upcoming: [], recovery: [], recent: [{ ...row, attended }] }}
      onAttendanceChanged={changed}
    />,
  );
}
async function showHistory() {
  const user = userEvent.setup();
  await user.click(screen.getByText("Historial reciente (últimas 10 prácticas)"));
  return user;
}
describe("asistencia administrativa E4", () => {
  it("corrige una completada antigua con motivo y actualiza el valor, sin límite de 48 horas", async () => {
    renderSchedule();
    const user = await showHistory();
    await user.click(screen.getByRole("button", { name: "Corregir asistencia" }));
    const dialog = screen.getByRole("dialog", { name: "Corregir asistencia" });
    expect(dialog).toHaveTextContent("Valor actual: Asistió. Nuevo valor: No asistió.");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar cambio" }));
    expect(api.patch).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Motivo de la corrección")).toHaveFocus();
    await user.type(
      screen.getByLabelText("Motivo de la corrección"),
      "  Se verificó la asistencia con el instructor  ",
    );
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(api.patch).toHaveBeenCalledExactlyOnceWith(
      "/practice-slots/slot/attendance/correction",
      { attended: false, motivo: "Se verificó la asistencia con el instructor" },
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("No asistió")).toBeInTheDocument();
    expect(changed).toHaveBeenCalledWith("slot");
    expect(screen.getByRole("button", { name: "Corregir asistencia" })).toHaveFocus();
  });
  it.each([true, false])(
    "resuelve una completada sin registrar como %s, con motivo obligatorio",
    async (attended) => {
      vi.mocked(api.patch).mockResolvedValue({ id: "slot", attended });
      renderSchedule(null);
      const user = await showHistory();
      await user.click(screen.getByRole("button", { name: "Registrar asistencia" }));
      await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
      expect(screen.getByRole("alert")).toHaveTextContent("Selecciona si el alumno asistió");
      await user.selectOptions(screen.getByLabelText("Asistencia a registrar"), String(attended));
      await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
      expect(api.patch).not.toHaveBeenCalled();
      await user.type(
        screen.getByLabelText("Motivo de la corrección"),
        "Registro revisado por administración",
      );
      await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
      expect(api.patch).toHaveBeenCalledWith("/practice-slots/slot/attendance/correction", {
        attended,
        motivo: "Registro revisado por administración",
      });
    },
  );
  it("ofrece acciones solo en completadas y mantiene la vista de consulta sin peticiones extra", () => {
    render(
      <StudentSchedule
        schedule={{
          upcoming: [{ ...row, status: "confirmada", attended: null }],
          recovery: [],
          recent: [],
        }}
        onAttendanceChanged={changed}
      />,
    );
    expect(screen.queryByRole("button", { name: /asistencia|auditoría/ })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });
  it("muestra error de corrección y conserva motivo para reintentar", async () => {
    vi.mocked(api.patch).mockRejectedValueOnce(
      new ApiError("conflicto", 409, { code: "ATTENDANCE_SAME_VALUE" }),
    );
    renderSchedule();
    const user = await showHistory();
    await user.click(screen.getByRole("button", { name: "Corregir asistencia" }));
    await user.type(screen.getByLabelText("Motivo de la corrección"), "Revisión con el instructor");
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("debe cambiar el valor actual");
    expect(screen.getByLabelText("Motivo de la corrección")).toHaveValue(
      "Revisión con el instructor",
    );
    expect(changed).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(await screen.findByRole("status")).toHaveTextContent("se guardó correctamente");
  });
  it("presenta quién, rol, hora de Ecuador, valores y motivo en la auditoría", async () => {
    renderSchedule();
    const user = await showHistory();
    const trigger = screen.getByRole("button", { name: "Ver auditoría" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Auditoría de asistencia" });
    expect(await within(dialog).findByText(/María Pérez · Administrador/)).toBeInTheDocument();
    expect(dialog).toHaveTextContent("ID del actor: actor-admin");
    expect(dialog).toHaveTextContent("15:00");
    expect(dialog).toHaveTextContent("Valor anterior: Asistió. Valor nuevo: No asistió.");
    expect(dialog).toHaveTextContent(event.motivo!);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
  it("pagina sin mezclar eventos de páginas distintas", async () => {
    vi.mocked(api.get).mockImplementation(async (path) =>
      path.startsWith("/users")
        ? []
        : path === auditPath(2)
          ? {
              items: [
                {
                  ...event,
                  id: "initial",
                  tipo: "registro",
                  previousAttended: null,
                  newAttended: true,
                  motivo: null,
                },
              ],
              page: 2,
              pageSize: 20,
              total: 21,
            }
          : { items: [event], page: 1, pageSize: 20, total: 21 },
    );
    renderSchedule();
    const user = await showHistory();
    await user.click(screen.getByRole("button", { name: "Ver auditoría" }));
    await screen.findByText(event.motivo!, { exact: false });
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("Registro inicial")).toBeInTheDocument();
    expect(screen.queryByText(event.motivo!, { exact: false })).not.toBeInTheDocument();
    expect(screen.getByText(/no requiere motivo/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(auditPath(2));
  });
  it("maneja carga, error y reintento y estado vacío", async () => {
    let reject!: (error: unknown) => void;
    vi.mocked(api.get).mockImplementation((path) =>
      path.startsWith("/users")
        ? Promise.resolve([])
        : new Promise((_, fail) => {
            reject = fail;
          }),
    );
    renderSchedule();
    const user = await showHistory();
    await user.click(screen.getByRole("button", { name: "Ver auditoría" }));
    expect(screen.getByRole("status")).toHaveTextContent("Cargando auditoría");
    reject(new ApiError("Sin conexión", 503));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión");
    vi.mocked(api.get).mockResolvedValueOnce({ items: [], page: 1, pageSize: 20, total: 0 });
    await user.click(screen.getByRole("button", { name: "Reintentar auditoría" }));
    expect(await screen.findByText("Sin eventos de asistencia")).toBeInTheDocument();
  });
  it("conserva la auditoría y el ID del actor si no se puede consultar su nombre", async () => {
    vi.mocked(api.get).mockImplementation(async (path) => {
      if (path.startsWith("/users")) throw new Error("Sin catálogo de actores");
      return { items: [event], page: 1, pageSize: 20, total: 1 };
    });
    renderSchedule();
    const user = await showHistory();
    await user.click(screen.getByRole("button", { name: "Ver auditoría" }));
    expect(await screen.findByText(/Nombre no disponible · Administrador/)).toBeInTheDocument();
    expect(screen.getByText("ID del actor: actor-admin")).toBeInTheDocument();
  });
  it("refresca la ficha y el requisito RF-07 después de corregir", async () => {
    let corrected = false;
    vi.mocked(api.patch).mockImplementation(async () => {
      corrected = true;
      return { id: "slot", attended: false };
    });
    vi.mocked(api.get).mockImplementation(async () => ({
      ...graduationStudent,
      practiceSchedule: { upcoming: [], recovery: [], recent: [{ ...row, attended: !corrected }] },
      graduation: {
        pendingCount: 1,
        enrollments: [
          {
            enrollmentId: "e",
            courseName: "Curso",
            checks: [
              {
                key: "practice",
                label: "Práctica",
                fulfilled: false,
                detail: corrected ? "0 de 10 horas" : "1 de 10 horas",
              },
            ],
          },
        ],
      },
    }));
    render(<StudentDetail id={graduationStudent.id} onChanged={changed} />);
    expect(await screen.findByText(/1 de 10 horas/)).toBeInTheDocument();
    const user = await showHistory();
    await user.click(screen.getByRole("button", { name: "Corregir asistencia" }));
    await user.type(
      screen.getByLabelText("Motivo de la corrección"),
      "Se revisó la práctica con el instructor",
    );
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(await screen.findByText(/0 de 10 horas/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
