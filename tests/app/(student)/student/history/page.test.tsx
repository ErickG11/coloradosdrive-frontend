import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentHistoryPage from "@/app/(student)/student/history/page";
import StudentPage from "@/app/(student)/student/page";
import { usePendingPracticeRatings } from "@/hooks/usePendingPracticeRatings";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type {
  PracticeHistoryEnrollment,
  PracticeHistoryItem,
  PracticeHistoryPage,
} from "@/types/practiceAttendance";

vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn() } }));
vi.mock("@/hooks/usePendingPracticeRatings", () => ({ usePendingPracticeRatings: vi.fn() }));
vi.mock("@/components/practice-ratings/StudentPendingRatings", () => ({
  StudentPendingRatings: () => null,
}));
const get = vi.mocked(api.get);
const enrollment: PracticeHistoryEnrollment = {
  enrollmentId: "e1",
  cohortId: "c1",
  courseId: "course",
  courseType: "A",
  status: "activo",
  horasObjetivo: 10,
};
const enrollmentsPath = "/estudiantes/practice-history/enrollments";
const path = (id = "e1", page = 1) =>
  `/estudiantes/practice-history?enrollmentId=${id}&page=${page}&pageSize=20`;
function item(overrides: Partial<PracticeHistoryItem> = {}): PracticeHistoryItem {
  return {
    id: "practice:slot",
    practiceSlotId: "slot",
    cancellationId: null,
    scheduledAt: "2026-10-26T20:00:00Z",
    durationMinutes: 60,
    slotStatus: "completado",
    attended: true,
    estado: "asistio",
    resultado: null,
    motivo: null,
    ...overrides,
  };
}
function history(overrides: Partial<PracticeHistoryPage> = {}): PracticeHistoryPage {
  return {
    enrollmentId: "e1",
    page: 1,
    pageSize: 20,
    total: 1,
    items: [item()],
    summary: { horasAsistidas: 6, horasObjetivo: 10, horasPerdidas: 3 },
    ...overrides,
  };
}
beforeEach(() => {
  vi.mocked(usePendingPracticeRatings).mockReturnValue({
    items: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  get.mockReset();
  get.mockImplementation(async (url) => (url === enrollmentsPath ? [enrollment] : history()));
});
describe("historial de asistencia del alumno E4", () => {
  it("muestra todos los estados en español y usa el resumen del backend completo", async () => {
    const items: PracticeHistoryItem[] = [
      item(),
      item({ id: "no", estado: "no_asistio", attended: false }),
      item({ id: "pending", estado: "pendiente", attended: null }),
      item({
        id: "free",
        estado: "liberada",
        attended: null,
        resultado: "reprogramable",
        slotStatus: null,
      }),
      item({
        id: "absence",
        estado: "falta",
        attended: null,
        resultado: "falta",
        slotStatus: null,
      }),
      item({
        id: "cancelled",
        estado: "cancelada",
        attended: null,
        resultado: "hora_perdida",
        slotStatus: null,
        motivo: "No había otro horario elegible",
      }),
    ];
    get.mockImplementation(async (url) =>
      url === enrollmentsPath ? [enrollment] : history({ items, total: 6 }),
    );
    render(<StudentHistoryPage />);
    expect(await screen.findByText("6 de 10 horas asistidas")).toBeInTheDocument();
    for (const label of [
      "Asistió",
      "No asistió",
      "Pendiente",
      "Liberada",
      "Cancelada sin reprogramación (cuenta como falta)",
      "Cancelada",
    ])
      expect(screen.getByText(label, { exact: true })).toBeInTheDocument();
    const progress = screen.getByRole("progressbar", { name: "Progreso de horas asistidas" });
    expect(progress).toHaveAttribute("aria-valuenow", "6");
    expect(progress).toHaveAttribute("aria-valuemax", "10");
    expect(progress).toHaveAttribute("aria-valuetext", "6 de 10 horas asistidas");
    expect(screen.getByText("3 horas")).toBeInTheDocument();
    expect(screen.getByText(/No reduce las horas/)).toBeInTheDocument();
    expect(screen.getByText(/Solo las prácticas registradas como «Asistió»/)).toBeInTheDocument();
    expect(screen.getByText(/El instructor aún no registra/)).toBeInTheDocument();
    expect(screen.getByText(/No había otro horario/)).toBeInTheDocument();
    expect(screen.getAllByText(/15:00/)).toHaveLength(6);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
  it("carga matrículas y luego historial con estados de carga", async () => {
    let resolveEnrollments!: (value: PracticeHistoryEnrollment[]) => void;
    let resolveHistory!: (value: PracticeHistoryPage) => void;
    get.mockImplementation((url) =>
      url === enrollmentsPath
        ? new Promise((done) => {
            resolveEnrollments = done;
          })
        : new Promise((done) => {
            resolveHistory = done;
          }),
    );
    render(<StudentHistoryPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando matrículas");
    await act(async () => resolveEnrollments([enrollment]));
    expect(screen.getByRole("status")).toHaveTextContent("Cargando historial");
    await act(async () => resolveHistory(history()));
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
  it("cambia de matrícula, reinicia paginación e ignora respuestas antiguas", async () => {
    const second = {
      ...enrollment,
      enrollmentId: "e2",
      courseType: "B" as const,
      status: "finalizado" as const,
    };
    let old!: (value: PracticeHistoryPage) => void;
    get.mockImplementation(async (url) => {
      if (url === enrollmentsPath) return [enrollment, second];
      if (url === path("e1", 2))
        return new Promise((done) => {
          old = done;
        });
      if (url === path("e2"))
        return history({
          enrollmentId: "e2",
          items: [item({ id: "second", motivo: "Solo matrícula B" })],
          summary: { horasAsistidas: 1, horasObjetivo: 5, horasPerdidas: 0 },
        });
      return history({ total: 21 });
    });
    const user = userEvent.setup();
    render(<StudentHistoryPage />);
    await screen.findByText("6 de 10 horas asistidas");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(get).toHaveBeenCalledWith(path("e1", 2));
    await user.selectOptions(screen.getByRole("combobox", { name: "Matrícula" }), "e2");
    expect(await screen.findByText("1 de 5 horas asistidas")).toBeInTheDocument();
    await act(async () =>
      old(history({ page: 2, items: [item({ motivo: "Respuesta antigua" })] })),
    );
    expect(screen.queryByText(/Respuesta antigua/)).not.toBeInTheDocument();
    expect(screen.queryByText("6 de 10 horas asistidas")).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(path("e2", 1));
  });
  it("pagina en orden del servidor y lleva el foco al encabezado", async () => {
    get.mockImplementation(async (url) =>
      url === enrollmentsPath
        ? [enrollment]
        : url === path("e1", 2)
          ? history({ page: 2, total: 21, items: [item({ id: "old", motivo: "Última práctica" })] })
          : history({ total: 21 }),
    );
    const user = userEvent.setup();
    render(<StudentHistoryPage />);
    await screen.findByRole("progressbar");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText(/Última práctica/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Historial de prácticas" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Anterior" }));
    await waitFor(() => expect(get).toHaveBeenLastCalledWith(path()));
  });
  it("maneja 409 sin mostrar horas equivocadas y permite elegir otra matrícula", async () => {
    get.mockImplementation(async (url) => {
      if (url === enrollmentsPath)
        return [enrollment, { ...enrollment, enrollmentId: "e2", courseType: "B" }];
      if (url === path())
        throw new ApiError("Hay varias matrículas", 409, { code: "PRACTICE_CONFLICT" });
      return history({ enrollmentId: "e2" });
    });
    const user = userEvent.setup();
    render(<StudentHistoryPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Pide al administrador");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Matrícula"), "e2");
    expect(await screen.findByRole("progressbar")).toBeInTheDocument();
  });
  it("permite reintentar el historial y actualizar los totales", async () => {
    let failed = true;
    get.mockImplementation(async (url) => {
      if (url === enrollmentsPath) return [enrollment];
      if (failed) throw new ApiError("Sin conexión", 503);
      return history();
    });
    const user = userEvent.setup();
    render(<StudentHistoryPage />);
    await screen.findByRole("alert");
    failed = false;
    await user.click(screen.getByRole("button", { name: "Reintentar historial" }));
    expect(await screen.findByText("6 de 10 horas asistidas")).toBeInTheDocument();
    get.mockResolvedValueOnce(
      history({ summary: { horasAsistidas: 7, horasObjetivo: 10, horasPerdidas: 2 } }),
    );
    await user.click(screen.getByRole("button", { name: "Actualizar historial" }));
    expect(await screen.findByText("7 de 10 horas asistidas")).toBeInTheDocument();
  });
  it("permite reintentar matrículas y presenta el estado sin matrículas", async () => {
    get.mockRejectedValueOnce(new Error("network"));
    const user = userEvent.setup();
    render(<StudentHistoryPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar tus matrículas",
    );
    get.mockResolvedValueOnce([]);
    await user.click(screen.getByRole("button", { name: "Reintentar matrículas" }));
    expect(await screen.findByText("Aún no tienes matrículas")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });
  it("muestra historial vacío y objetivo desconocido sin inventar progreso", async () => {
    get.mockImplementation(async (url) =>
      url === enrollmentsPath
        ? [{ ...enrollment, horasObjetivo: null }]
        : history({
            items: [],
            total: 0,
            summary: { horasAsistidas: 0, horasObjetivo: null, horasPerdidas: 0 },
          }),
    );
    render(<StudentHistoryPage />);
    expect(await screen.findByText("Sin prácticas en esta página")).toBeInTheDocument();
    expect(screen.getByText(/Objetivo de horas sin registrar/)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });
  it("ofrece Calificar solo si la lista de pendientes confirma la práctica", async () => {
    vi.mocked(usePendingPracticeRatings).mockReturnValue({
      items: [
        {
          practiceSlotId: "slot",
          instructorName: "Ana Torres",
          scheduledAt: "2026-10-26T20:00:00Z",
          opensAt: "2026-10-26T21:05:00Z",
          closesAt: "2026-10-27T21:05:00Z",
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    get.mockImplementation(async (url) =>
      url === enrollmentsPath
        ? [enrollment]
        : history({ items: [item(), item({ id: "other", practiceSlotId: "other" })], total: 2 }),
    );
    const user = userEvent.setup();
    render(<StudentHistoryPage />);
    const rate = await screen.findByRole("button", { name: "Calificar" });
    expect(screen.getAllByRole("button", { name: "Calificar" })).toHaveLength(1);
    await user.click(rate);
    expect(screen.getByRole("dialog", { name: "Calificar práctica" })).toBeInTheDocument();
  });
  it("limita la barra al objetivo sin ocultar horas adicionales", async () => {
    get.mockImplementation(async (url) =>
      url === enrollmentsPath
        ? [enrollment]
        : history({ summary: { horasAsistidas: 12, horasObjetivo: 10, horasPerdidas: 0 } }),
    );
    render(<StudentHistoryPage />);
    expect(await screen.findByText("12 de 10 horas asistidas")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "10");
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "12 de 10 horas asistidas",
    );
  });
  it("reemplaza el Próximamente del inicio por accesos a horarios e historial", () => {
    render(<StudentPage />);
    expect(screen.queryByText("Próximamente.")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver mi historial de asistencia" })).toHaveAttribute(
      "href",
      "/student/history",
    );
    expect(screen.getByRole("link", { name: "Ver mis horarios" })).toHaveAttribute(
      "href",
      "/student/schedule",
    );
  });
});
