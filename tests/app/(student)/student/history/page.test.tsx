import { act, render, screen, waitFor, within } from "@testing-library/react";
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
// Sin sesión ni canales reales: la pantalla solo los usa para refrescar.
vi.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => null }));
vi.mock("@/hooks/useRealtimeChannel", () => ({ useRealtimeChannel: vi.fn() }));
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
const slotsPath = "/practice-slots";
const path = (id = "e1", page = 1) =>
  `/estudiantes/practice-history?enrollmentId=${id}&page=${page}&pageSize=100`;
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
    pageSize: 100,
    total: 1,
    items: [item()],
    summary: { horasAsistidas: 6, horasObjetivo: 10, horasPerdidas: 3 },
    ...overrides,
  };
}
// Responde cada GET según su URL: matrículas, prácticas propias (instructores) e historial.
function mockApi(
  historyFor: (url: string) => PracticeHistoryPage | Promise<PracticeHistoryPage> = () => history(),
  enrollments: PracticeHistoryEnrollment[] = [enrollment],
) {
  get.mockImplementation(async (url) => {
    if (url === enrollmentsPath) return enrollments;
    if (url === slotsPath) return [];
    return historyFor(url);
  });
}
const attended = (label: string) => screen.getAllByText(label, { exact: true });
beforeEach(() => {
  vi.mocked(usePendingPracticeRatings).mockReturnValue({
    items: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  get.mockReset();
  mockApi();
});
describe("historial de asistencia del alumno E4", () => {
  it("muestra todos los estados en español y el resumen del backend", async () => {
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
        id: "lost",
        estado: "cancelada",
        attended: null,
        resultado: "hora_perdida",
        slotStatus: null,
        motivo: "No había otro horario elegible",
      }),
      item({
        id: "cancelled",
        estado: "cancelada",
        attended: null,
        resultado: "reprogramable",
        slotStatus: null,
      }),
    ];
    mockApi(() => history({ items, total: 7 }));
    render(<StudentHistoryPage />);

    const progress = await screen.findByRole("progressbar", {
      name: "Progreso de horas asistidas",
    });
    expect(progress).toHaveAttribute("aria-valuenow", "6");
    expect(progress).toHaveAttribute("aria-valuemax", "10");
    expect(progress).toHaveAttribute("aria-valuetext", "6 de 10 horas asistidas");
    for (const label of [
      "Asistió",
      "No asistió",
      "Por registrar",
      "Pendiente por reponer",
      "Falta",
      "Hora perdida",
      "Cancelada",
    ])
      expect(attended(label).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Solo las horas registradas como «Asistió» cuentan/),
    ).toBeInTheDocument();
    expect(screen.getByText("Horas perdidas")).toBeInTheDocument();
    expect(screen.getByText("Tu camino a la certificación")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("muestra el estado de carga mientras llegan las matrículas y el historial", async () => {
    let resolveEnrollments!: (value: PracticeHistoryEnrollment[]) => void;
    let resolveHistory!: (value: PracticeHistoryPage) => void;
    get.mockImplementation((url) =>
      url === enrollmentsPath
        ? new Promise((done) => {
            resolveEnrollments = done;
          })
        : url === slotsPath
          ? Promise.resolve([])
          : new Promise((done) => {
              resolveHistory = done;
            }),
    );
    render(<StudentHistoryPage />);
    expect(screen.getByRole("status", { name: "Cargando tu historial" })).toBeInTheDocument();
    await act(async () => resolveEnrollments([enrollment]));
    expect(screen.getByRole("status", { name: "Cargando tu historial" })).toBeInTheDocument();
    await act(async () => resolveHistory(history()));
    expect(await screen.findByRole("progressbar")).toBeInTheDocument();
  });

  it("cambia de matrícula y muestra solo el historial de la elegida", async () => {
    const second = {
      ...enrollment,
      enrollmentId: "e2",
      courseType: "B" as const,
      status: "finalizado" as const,
    };
    mockApi(
      (url) =>
        url === path("e2")
          ? history({
              enrollmentId: "e2",
              summary: { horasAsistidas: 1, horasObjetivo: 5, horasPerdidas: 0 },
            })
          : history(),
      [enrollment, second],
    );
    const user = userEvent.setup();
    render(<StudentHistoryPage />);
    await screen.findByRole("progressbar");
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "6 de 10 horas asistidas",
    );

    const select = screen.getByRole("combobox", { name: "Matrícula" });
    expect(
      within(select).getByRole("option", { name: /Curso tipo B · Finalizada/ }),
    ).toBeInTheDocument();
    await user.selectOptions(select, "e2");

    await waitFor(() =>
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuetext",
        "1 de 5 horas asistidas",
      ),
    );
    expect(get).toHaveBeenCalledWith(path("e2"));
  });

  it("recoge todas las páginas del historial en segundo plano", async () => {
    const page = (n: number, ids: string[]) =>
      history({
        page: n,
        total: 101,
        items: ids.map((id) => item({ id: `practice:${id}`, practiceSlotId: id })),
      });
    const first = Array.from({ length: 100 }, (_, index) => `a${index}`);
    mockApi((url) => (url === path("e1", 2) ? page(2, ["z1"]) : page(1, first)));
    render(<StudentHistoryPage />);

    await screen.findByRole("progressbar");
    await waitFor(() => expect(get).toHaveBeenCalledWith(path("e1", 2), expect.anything()));
    await waitFor(() => expect(screen.getByText(/Actualizado/)).toBeInTheDocument());
    expect(screen.queryByText(/No pudimos completar la actualización/)).not.toBeInTheDocument();
  });

  it("avisa si el historial cambió mientras se consultaban las páginas", async () => {
    const first = Array.from({ length: 100 }, (_, index) => `a${index}`).map((id) =>
      item({ id: `practice:${id}`, practiceSlotId: id }),
    );
    mockApi((url) =>
      url === path("e1", 2)
        ? history({
            page: 2,
            total: 150,
            items: [item({ id: "practice:z1", practiceSlotId: "z1" })],
          })
        : history({ total: 101, items: first }),
    );
    render(<StudentHistoryPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos completar la actualización. Reintenta para ver todas tus prácticas.",
    );
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("maneja 409 sin mostrar horas equivocadas y permite elegir otra matrícula", async () => {
    mockApi(
      (url) => {
        if (url === path())
          throw new ApiError("Hay varias matrículas", 409, { code: "PRACTICE_CONFLICT" });
        return history({ enrollmentId: "e2" });
      },
      [enrollment, { ...enrollment, enrollmentId: "e2", courseType: "B" }],
    );
    const user = userEvent.setup();
    render(<StudentHistoryPage />);

    expect(await screen.findByText("Tu historial necesita revisión")).toBeInTheDocument();
    expect(screen.getByText(/Pide a la escuela que revise tu historial/)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Matrícula" }), "e2");
    expect(await screen.findByRole("progressbar")).toBeInTheDocument();
  });

  it("permite reintentar el historial y actualizar los totales", async () => {
    let failed = true;
    let updated = false;
    mockApi((url) => {
      if (failed) throw new ApiError("Sin conexión", 503);
      return url === path() && updated
        ? history({ summary: { horasAsistidas: 7, horasObjetivo: 10, horasPerdidas: 2 } })
        : history();
    });
    const user = userEvent.setup();
    render(<StudentHistoryPage />);

    expect(await screen.findByText("No pudimos cargar tu historial")).toBeInTheDocument();
    failed = false;
    await user.click(screen.getByRole("button", { name: "Reintentar historial" }));
    expect(await screen.findByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "6 de 10 horas asistidas",
    );

    updated = true;
    await user.click(screen.getByRole("button", { name: "Actualizar historial" }));
    await waitFor(() =>
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuetext",
        "7 de 10 horas asistidas",
      ),
    );
  });

  it("permite reintentar matrículas y presenta el estado sin matrículas", async () => {
    let failed = true;
    get.mockImplementation(async (url) => {
      if (url === enrollmentsPath) {
        if (failed) throw new Error("network");
        return [];
      }
      return [];
    });
    const user = userEvent.setup();
    render(<StudentHistoryPage />);

    expect(await screen.findByText("No se pudieron cargar tus matrículas")).toBeInTheDocument();
    failed = false;
    await user.click(screen.getByRole("button", { name: "Reintentar matrículas" }));
    expect(await screen.findByText("Tu historial de asistencia empieza aquí")).toBeInTheDocument();
  });

  it("sin prácticas registradas muestra el estado vacío del historial", async () => {
    mockApi(() =>
      history({
        items: [],
        total: 0,
        summary: { horasAsistidas: 0, horasObjetivo: 10, horasPerdidas: 0 },
      }),
    );
    render(<StudentHistoryPage />);

    expect(await screen.findByText("Aún no tienes prácticas en tu historial")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("con objetivo de horas desconocido no inventa progreso", async () => {
    mockApi(() =>
      history({ summary: { horasAsistidas: 2, horasObjetivo: null, horasPerdidas: 0 } }),
    );
    render(<StudentHistoryPage />);

    expect(
      await screen.findByText(/La escuela aún no ha registrado un objetivo de horas válido/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Progreso de horas asistidas" })).toBeInTheDocument();
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
    mockApi(() =>
      history({
        items: [
          item(),
          item({
            id: "other",
            practiceSlotId: "other",
            scheduledAt: "2026-10-27T20:00:00Z",
          }),
        ],
        total: 2,
      }),
    );
    const user = userEvent.setup();
    render(<StudentHistoryPage />);

    const rate = await screen.findByRole("button", { name: "Calificar" });
    expect(screen.getAllByRole("button", { name: "Calificar" })).toHaveLength(1);
    await user.click(rate);
    expect(screen.getByRole("dialog", { name: "Calificar práctica" })).toBeInTheDocument();
  });

  it("limita la barra al objetivo sin ocultar horas adicionales", async () => {
    mockApi(() =>
      history({ summary: { horasAsistidas: 12, horasObjetivo: 10, horasPerdidas: 0 } }),
    );
    render(<StudentHistoryPage />);

    const progress = await screen.findByRole("progressbar");
    expect(progress).toHaveAttribute("aria-valuenow", "10");
    expect(progress).toHaveAttribute("aria-valuetext", "12 de 10 horas asistidas");
  });

  it("abre el detalle de una práctica con su motivo registrado", async () => {
    mockApi(() =>
      history({
        items: [
          item({
            id: "lost",
            estado: "cancelada",
            attended: null,
            resultado: "hora_perdida",
            slotStatus: null,
            motivo: "No había otro horario elegible",
          }),
        ],
      }),
    );
    const user = userEvent.setup();
    render(<StudentHistoryPage />);

    await user.click(
      await screen.findByRole("button", { name: /Ver detalle del 26 de octubre, 15:00/ }),
    );

    const dialog = await screen.findByRole("dialog", { name: "Detalle de la práctica" });
    expect(within(dialog).getByText("Motivo registrado")).toBeInTheDocument();
    expect(within(dialog).getByText("No había otro horario elegible")).toBeInTheDocument();
    expect(within(dialog).getByText("Hora perdida, sin reposición")).toBeInTheDocument();
  });

  it("filtra la línea de tiempo por asistencia", async () => {
    mockApi(() =>
      history({
        items: [
          item(),
          item({
            id: "no",
            estado: "no_asistio",
            attended: false,
            scheduledAt: "2026-10-27T20:00:00Z",
          }),
        ],
        total: 2,
      }),
    );
    const user = userEvent.setup();
    render(<StudentHistoryPage />);
    await screen.findByRole("progressbar");

    await user.click(screen.getByRole("button", { name: /^Asistidas/ }));

    const timeline = screen.getByRole("region", { name: "Línea de tiempo de asistencia" });
    // La entrada que sale se anima antes de desmontarse: se espera a que quede una sola.
    await waitFor(() =>
      expect(within(timeline).getAllByRole("button", { name: /Ver detalle/ })).toHaveLength(1),
    );
    expect(
      within(timeline).queryByText("No asistió", { selector: "span" }),
    ).not.toBeInTheDocument();
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
