import { act, render, screen, waitForElementToBeRemoved, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import InstructorPage from "@/app/(instructor)/instructor/page";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { PracticeSlot, PracticeSlotWithNames } from "@/types";

vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), patch: vi.fn() } }));

const get = vi.mocked(api.get);
const patch = vi.mocked(api.patch);
const slot: PracticeSlotWithNames = {
  id: "slot-1",
  cohortId: "cohort-1",
  instructorId: "instructor-1",
  studentId: "student-1",
  scheduledAt: "2026-03-10T15:00:00.000Z",
  durationMinutes: 60,
  status: "completado",
  studentName: "Ana Torres",
  instructorName: "Bruno Salas",
  attended: null,
  confirmationNotifiedAt: null,
  releaseNotifiedAt: null,
  confirmedAt: null,
  createdAt: "",
  updatedAt: "",
};

// PATCH devuelve PracticeSlot sin los nombres incluidos en el GET.
function attendanceResponse(attended: boolean): PracticeSlot {
  return {
    id: slot.id,
    cohortId: slot.cohortId,
    instructorId: slot.instructorId,
    studentId: slot.studentId,
    scheduledAt: slot.scheduledAt,
    durationMinutes: slot.durationMinutes,
    status: slot.status,
    confirmationNotifiedAt: slot.confirmationNotifiedAt,
    releaseNotifiedAt: slot.releaseNotifiedAt,
    confirmedAt: slot.confirmedAt,
    attended,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
  };
}

const rangePath = (from: string, to: string) =>
  `/practice-slots?${new URLSearchParams({ from, to })}`;
const currentPath = rangePath("2026-03-09T05:00:00.000Z", "2026-03-16T05:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-10T15:00:00Z"));
  get.mockResolvedValue([slot]);
});
afterEach(() => vi.useRealTimers());

describe("agenda diaria del instructor", () => {
  it("abre en hoy, pide solo la semana y muestra el selector L M X J V S D", async () => {
    render(<InstructorPage />);
    expect(get).toHaveBeenCalledExactlyOnceWith(currentPath);
    expect(await screen.findByText("Ana Torres")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Martes 10 de marzo" })).toBeInTheDocument();
    const days = within(screen.getByRole("navigation", { name: "Días de la semana" })).getAllByRole(
      "button",
    );
    expect(days).toHaveLength(7);
    expect(days.map((button) => button.firstChild?.textContent)).toEqual([
      "L",
      "M",
      "X",
      "J",
      "V",
      "S",
      "D",
    ]);
    expect(days[1]).toHaveAttribute("aria-pressed", "true");
    expect(days[1]).toHaveAttribute("aria-current", "date");
    expect(days[1]).toHaveAccessibleName("Martes 10 de marzo, 1 franjas con alumno, hoy");
    expect(screen.getByText("10:00 – 11:00")).toBeInTheDocument();
    expect(screen.queryByText("Mis datos")).not.toBeInTheDocument();
    expect(get.mock.calls.every(([path]) => path.startsWith("/practice-slots?"))).toBe(true);
  });

  it("cambia de día sin pedir de nuevo la semana y ordena por hora", async () => {
    get.mockResolvedValueOnce([
      slot,
      { ...slot, id: "late", scheduledAt: "2026-03-09T21:00:00Z", studentName: "Última" },
      {
        ...slot,
        id: "first",
        scheduledAt: "2026-03-09T13:00:00Z",
        studentName: "Primera",
        durationMinutes: 90,
      },
    ]);
    const user = userEvent.setup();
    render(<InstructorPage />);
    await screen.findByText("Ana Torres");
    await user.click(
      screen.getByRole("button", { name: "Lunes 9 de marzo, 2 franjas con alumno" }),
    );
    const rows = screen.getAllByRole("article");
    expect(rows[0]).toHaveTextContent("08:00 – 09:30");
    expect(rows[0]).toHaveTextContent("Primera");
    expect(rows[1]).toHaveTextContent("16:00 – 17:00");
    expect(screen.queryByText("Ana Torres")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Martes 10 de marzo/ })).toHaveAttribute(
      "aria-current",
      "date",
    );
    expect(screen.getByRole("button", { name: /Lunes 9 de marzo/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(get).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: /Miércoles 11 de marzo/ }));
    expect(screen.getByText("No tienes prácticas con alumno este día.")).toBeInTheDocument();
  });

  it("navega por semanas, conserva el día de semana y mantiene los datos mientras carga", async () => {
    let resolve!: (rows: PracticeSlotWithNames[]) => void;
    get.mockResolvedValueOnce([slot]).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const user = userEvent.setup();
    render(<InstructorPage />);
    await screen.findByText("Ana Torres");
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));
    expect(get).toHaveBeenLastCalledWith(
      rangePath("2026-03-16T05:00:00.000Z", "2026-03-23T05:00:00.000Z"),
    );
    expect(screen.getByRole("heading", { name: "Martes 10 de marzo" })).toBeInTheDocument();
    expect(screen.getByText("Ana Torres")).toBeInTheDocument();
    expect(screen.getByText("Cargando horario…")).toBeInTheDocument();
    await act(async () => resolve([]));
    expect(screen.getByText("16 - 22 de marzo, 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Martes 17 de marzo" })).toBeInTheDocument();
    expect(screen.getByText("No tienes prácticas con alumno este día.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Semana anterior" }));
    expect(get).toHaveBeenLastCalledWith(currentPath);
    expect(await screen.findByText("Ana Torres")).toBeInTheDocument();
  });

  it("mantiene la semana y el día ante un error, y permite reintentar con Hoy", async () => {
    get
      .mockResolvedValueOnce([slot])
      .mockRejectedValueOnce(new ApiError("Sin conexión", 503))
      .mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(<InstructorPage />);
    await screen.findByText("Ana Torres");
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión");
    expect(screen.getByText("9 - 15 de marzo, 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Martes 10 de marzo" })).toBeInTheDocument();
    expect(screen.getByText("Ana Torres")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hoy" }));
    expect(get).toHaveBeenLastCalledWith(currentPath);
    expect(await screen.findByText("No tienes prácticas con alumno este día.")).toBeInTheDocument();
  });

  it("muestra carga y error inicial sin presentar datos de otra pantalla", async () => {
    get.mockRejectedValueOnce(new Error("network"));
    render(<InstructorPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando horario");
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo consultar el horario");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it.each([
    ["asignado", "Reservada"],
    ["confirmado", "Confirmada"],
    ["completado", "Realizada"],
  ] as const)(
    "muestra %s con alumno como %s y asistencia solo si fue realizada",
    async (status, label) => {
      get.mockResolvedValueOnce([{ ...slot, status }]);
      render(<InstructorPage />);
      const row = await screen.findByRole("article");
      expect(within(row).getByText(label)).toBeInTheDocument();
      expect(within(row).getByText("Ana Torres")).toBeInTheDocument();
      expect(screen.queryAllByRole("button", { name: "Asistió" })).toHaveLength(
        status === "completado" ? 1 : 0,
      );
      expect(
        screen.getByRole("button", {
          name: /Martes 10 de marzo, 1 franjas con alumno/,
        }),
      ).toBeInTheDocument();
    },
  );

  it("muestra las horas libres en una línea, omite sin_practica y filtra las pasadas de hoy", async () => {
    get.mockResolvedValueOnce([
      slot,
      { ...slot, id: "past", status: "disponible", studentId: null, studentName: null, scheduledAt: "2026-03-10T14:00:00Z" },
      { ...slot, id: "free", status: "disponible", studentId: null, studentName: null, scheduledAt: "2026-03-10T16:00:00Z" },
      { ...slot, id: "released", status: "liberado", studentId: null, studentName: null, scheduledAt: "2026-03-10T17:00:00Z" },
      { ...slot, id: "no-practice", status: "sin_practica", studentId: null, studentName: null, scheduledAt: "2026-03-10T18:00:00Z" },
    ]);
    render(<InstructorPage />);
    expect(await screen.findByText("Ana Torres")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Horas libres: 11:00, 12:00")).toBeInTheDocument();
    expect(screen.queryByText("09:00")).not.toBeInTheDocument();
    expect(screen.queryByText(/sin_practica|Sin alumno|Liberado/i)).not.toBeInTheDocument();
  });

  it("muestra las horas libres de un día anterior y deja vacío si solo hay sin_practica", async () => {
    get.mockResolvedValueOnce([
      { ...slot, id: "free-yesterday", status: "disponible", studentId: null, studentName: null, scheduledAt: "2026-03-09T13:00:00Z" },
      { ...slot, id: "no-practice-yesterday", status: "sin_practica", studentId: null, studentName: null, scheduledAt: "2026-03-09T14:00:00Z" },
    ]);
    const user = userEvent.setup();
    render(<InstructorPage />);
    await screen.findByText("No tienes prácticas con alumno este día.");
    await user.click(screen.getByRole("button", { name: /Lunes 9 de marzo/ }));
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText("Horas libres: 08:00")).toBeInTheDocument();
    expect(screen.queryByText("09:00")).not.toBeInTheDocument();
  });

  it.each([true, false])(
    "registra attended=%s sin confirmación y conserva el nombre del alumno",
    async (attended) => {
      patch.mockResolvedValue(attendanceResponse(attended));
      const user = userEvent.setup();
      render(<InstructorPage />);
      await screen.findByText("Ana Torres");
      await user.click(screen.getByRole("button", { name: attended ? "Asistió" : "No asistió" }));
      expect(patch).toHaveBeenCalledExactlyOnceWith("/practice-slots/slot-1/attendance", {
        attended,
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        await screen.findByText(`Asistencia guardada: ${attended ? "Asistió" : "No asistió"}`),
      ).toBeInTheDocument();
      expect(screen.getByText("Ana Torres")).toBeInTheDocument();
    },
  );

  it.each([true, false])(
    "confirma una corrección desde attended=%s y permite cancelar",
    async (attended) => {
      get.mockResolvedValueOnce([{ ...slot, attended }]);
      patch.mockResolvedValue(attendanceResponse(!attended));
      const user = userEvent.setup();
      render(<InstructorPage />);
      await screen.findByText("Ana Torres");
      await user.click(screen.getByRole("button", { name: "Cambiar asistencia" }));
      await user.click(screen.getByRole("button", { name: attended ? "No asistió" : "Asistió" }));
      let dialog = screen.getByRole("dialog", { name: "Confirmar cambio de asistencia" });
      expect(dialog).toHaveTextContent(`Valor actual: ${attended ? "Asistió" : "No asistió"}.`);
      expect(dialog).toHaveTextContent(`Nuevo valor: ${attended ? "No asistió" : "Asistió"}.`);
      expect(patch).not.toHaveBeenCalled();
      await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
      await waitForElementToBeRemoved(() => screen.queryByRole("dialog"));
      await user.click(screen.getByRole("button", { name: attended ? "No asistió" : "Asistió" }));
      dialog = screen.getByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "Confirmar cambio" }));
      expect(patch).toHaveBeenCalledExactlyOnceWith("/practice-slots/slot-1/attendance", {
        attended: !attended,
      });
      expect(
        await screen.findByText(`Asistencia guardada: ${attended ? "No asistió" : "Asistió"}`),
      ).toBeInTheDocument();
      expect(screen.getByText("Ana Torres")).toBeInTheDocument();
    },
  );

  it("permite reintentar tras un error al registrar asistencia", async () => {
    patch
      .mockRejectedValueOnce(new ApiError("Cuenta inactiva", 403))
      .mockResolvedValueOnce(attendanceResponse(true));
    const user = userEvent.setup();
    render(<InstructorPage />);
    await screen.findByText("Ana Torres");
    await user.click(screen.getByRole("button", { name: "Asistió" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cuenta inactiva");
    expect(screen.getByText("Asistencia: Sin registrar")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Asistió" }));
    expect(await screen.findByText("Asistencia guardada: Asistió")).toBeInTheDocument();
  });

  it("mantiene el diálogo ante un error de corrección para reintentar", async () => {
    get.mockResolvedValueOnce([{ ...slot, attended: true }]);
    patch
      .mockRejectedValueOnce(new ApiError("Franja no encontrada", 404))
      .mockResolvedValueOnce(attendanceResponse(false));
    const user = userEvent.setup();
    render(<InstructorPage />);
    await screen.findByText("Ana Torres");
    await user.click(screen.getByRole("button", { name: "Cambiar asistencia" }));
    await user.click(screen.getByRole("button", { name: "No asistió" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar cambio" }),
    );
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent(
      "Franja no encontrada",
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar cambio" }),
    );
    expect(await screen.findByText("Asistencia guardada: No asistió")).toBeInTheDocument();
  });
});

describe("bordes de Guayaquil independientes de TZ del runner", () => {
  it.each([
    ["lunes 22:00", "2026-03-10T03:00:00Z", "Lunes 9 de marzo", "22:00 – 23:00"],
    ["lunes 23:30", "2026-03-10T04:30:00Z", "Lunes 9 de marzo", "23:30 – 00:30"],
    ["domingo 23:45", "2026-03-16T04:45:00Z", "Domingo 15 de marzo", "23:45 – 00:45"],
    ["lunes 00:15", "2026-03-16T05:15:00Z", "Lunes 16 de marzo", "00:15 – 01:15"],
  ])(
    "ubica %s en el día correcto y calcula el fin",
    async (_label, scheduledAt, day, timeRange) => {
      vi.setSystemTime(new Date(scheduledAt));
      get.mockResolvedValueOnce([{ ...slot, scheduledAt }]);
      render(<InstructorPage />);
      expect(await screen.findByRole("article")).toHaveTextContent(timeRange);
      expect(screen.getByRole("heading", { name: day })).toBeInTheDocument();
      const selected = screen.getByRole("button", { name: `${day}, 1 franjas con alumno, hoy` });
      expect(selected).toHaveAttribute("aria-current", "date");
      expect(selected).toHaveAttribute("aria-pressed", "true");
    },
  );

  it.each([
    [
      "2026-03-16T04:45:00Z",
      "Domingo 15 de marzo",
      "2026-03-09T05:00:00.000Z",
      "2026-03-16T05:00:00.000Z",
    ],
    [
      "2026-03-16T05:15:00Z",
      "Lunes 16 de marzo",
      "2026-03-16T05:00:00.000Z",
      "2026-03-23T05:00:00.000Z",
    ],
  ])("Hoy y la semana actual para %s", async (instant, day, from, to) => {
    vi.setSystemTime(new Date(instant));
    get.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<InstructorPage />);
    await screen.findByText("No tienes prácticas con alumno este día.");
    expect(get).toHaveBeenCalledWith(rangePath(from, to));
    expect(screen.getByRole("heading", { name: day })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));
    await screen.findByText("No tienes prácticas con alumno este día.");
    await user.click(screen.getByRole("button", { name: "Hoy" }));
    expect(await screen.findByRole("heading", { name: day })).toBeInTheDocument();
    expect(get).toHaveBeenLastCalledWith(rangePath(from, to));
  });

  it("formatea solo la primera letra en mayúscula y navega entre años", async () => {
    vi.setSystemTime(new Date("2026-10-19T15:00:00Z"));
    get.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<InstructorPage />);
    expect(await screen.findByRole("heading", { name: "Lunes 19 de octubre" })).toBeInTheDocument();
    vi.setSystemTime(new Date("2026-12-28T04:30:00Z"));
    await user.click(screen.getByRole("button", { name: "Hoy" }));
    expect(
      await screen.findByRole("heading", { name: "Domingo 27 de diciembre" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));
    expect(
      await screen.findByText("28 de diciembre de 2026 - 3 de enero de 2027"),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Domingo 3 de enero" })).toBeInTheDocument();
  });
});
