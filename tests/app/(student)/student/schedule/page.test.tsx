import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StudentSchedulePage from "@/app/(student)/student/schedule/page";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useFetch } from "@/hooks/useFetch";
import { createClient } from "@/lib/supabase/client";
import type { PracticeSlotWithNames, StudentPracticeSlot } from "@/types";

vi.mock("@/hooks/useFetch", () => ({
  useFetch: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Sin este mock, useRealtimeChannel/useCurrentUserId llamarían al cliente
// REAL de Supabase (auth.getUser + channel().subscribe(), que intenta
// abrir un WebSocket) contra la URL de prueba - conexiones de red reales
// que no existen en este entorno de test.
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

const mockedUseFetch = vi.mocked(useFetch);
const mockedPost = vi.mocked(api.post);
const mockedGet = vi.mocked(api.get);
const mockedCreateClient = vi.mocked(createClient);

interface MockChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  emit: (event: string, payload: unknown) => void;
}

function createMockChannel(): MockChannel {
  const listeners = new Map<string, (arg: { payload: unknown }) => void>();
  const channel = {
    on: vi.fn(
      (_type: string, filter: { event: string }, cb: (arg: { payload: unknown }) => void) => {
        listeners.set(filter.event, cb);
        return channel;
      },
    ),
    subscribe: vi.fn().mockReturnThis(),
    emit: (event: string, payload: unknown) => listeners.get(event)?.({ payload }),
  };
  return channel as unknown as MockChannel;
}

// Mapa vivo de canal-por-nombre: cada llamada a supabase.channel(name)
// crea y registra un mock nuevo, así los tests pueden emitir eventos por
// canal (cohorte vs. personal) sin conocer el orden de suscripción.
function mockSupabaseClient(userId: string | null): Map<string, MockChannel> {
  const channels = new Map<string, MockChannel>();
  mockedCreateClient.mockReturnValue({
    channel: vi.fn((name: string) => {
      const channel = createMockChannel();
      channels.set(name, channel);
      return channel;
    }),
    removeChannel: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
      // useRealtimeChannel exige una sesión activa antes de suscribirse a
      // un canal privado (ver hooks/useRealtimeChannel.ts) - se simula una
      // ya resuelta para no tener que esperarla en cada test de esta página.
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { access_token: "test-access-token" } } }),
    },
    realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
  } as unknown as ReturnType<typeof createClient>);
  return channels;
}

function buildSlot(overrides: Partial<PracticeSlotWithNames> = {}): PracticeSlotWithNames {
  return {
    id: "slot-1",
    cohortId: "cohort-1",
    instructorId: "instructor-1",
    studentId: null,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 40,
    status: "disponible",
    confirmationNotifiedAt: null,
    releaseNotifiedAt: null,
    confirmedAt: null,
    attended: null,
    createdAt: "",
    updatedAt: "",
    instructorName: "Bruno Salas",
    studentName: null,
    ...overrides,
  };
}

const refetchSlots = vi.fn();

function mockFetch(
  slots: StudentPracticeSlot[],
  scopes = { A: slots[0]?.cohortId ?? null, B: null as string | null },
) {
  mockedUseFetch.mockImplementation((path: unknown) => {
    if (path === "/practice-slots") {
      return { data: slots, isLoading: false, error: null, refetch: refetchSlots };
    }
    if (path === "/estudiantes/enrollments")
      return {
        data: Object.entries(scopes)
          .filter(([, id]) => id)
          .map(([courseType, cohortId]) => ({ courseType, cohortId })),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    throw new Error(`useFetch mockeado con un path inesperado: ${String(path)}`);
  });
}

describe("StudentSchedulePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Valor por defecto inerte para los tests que no le importa Realtime;
    // los tests de Realtime llaman a mockSupabaseClient() de nuevo con el
    // id que necesiten, capturando el mapa de canales devuelto.
    mockSupabaseClient("student-1");
  });

  it("muestra un mensaje cuando no tiene franja propia ni hay disponibles", () => {
    mockFetch([]);

    render(<StudentSchedulePage />);

    expect(screen.getByText("No tienes ninguna franja reclamada todavía.")).toBeInTheDocument();
    expect(
      screen.getByText("No hay franjas disponibles en tus cohortes por ahora."),
    ).toBeInTheDocument();
  });

  it("lista franjas disponibles sin depender de la identidad del instructor", () => {
    const available = { ...buildSlot({ status: "disponible" }) };
    Reflect.deleteProperty(available, "instructorId");
    Reflect.deleteProperty(available, "instructorName");
    mockFetch([available]);

    render(<StudentSchedulePage />);

    expect(screen.queryByText(/Bruno Salas/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reclamar" })).toBeInTheDocument();
  });

  it("muestra el instructor en una franja propia ya asignada", () => {
    mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);
    render(<StudentSchedulePage />);
    expect(screen.getByText(/Bruno Salas/)).toBeInTheDocument();
  });

  it("una franja 'liberado' (sin dueño) aparece como disponible para reclamar", () => {
    mockFetch([buildSlot({ status: "liberado", studentId: null })]);

    render(<StudentSchedulePage />);

    expect(screen.getByRole("button", { name: "Reclamar" })).toBeInTheDocument();
  });

  it("reclama una franja: llama a POST .../claim y refresca la lista", async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue(buildSlot({ status: "asignado", studentId: "student-1" }));
    mockFetch([buildSlot({ status: "disponible" })]);

    render(<StudentSchedulePage />);
    await user.click(screen.getByRole("button", { name: "Reclamar" }));

    expect(mockedPost).toHaveBeenCalledWith("/practice-slots/slot-1/claim");
    expect(refetchSlots).toHaveBeenCalled();
  });

  it("muestra el error legible del backend si otro estudiante ya reclamó la franja (409)", async () => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValue(new ApiError("Esta franja ya no está disponible", 409));
    mockFetch([buildSlot({ status: "disponible" })]);

    render(<StudentSchedulePage />);
    await user.click(screen.getByRole("button", { name: "Reclamar" }));

    expect(await screen.findByText("Esta franja ya no está disponible")).toBeInTheDocument();
    // Se refresca igual: la lista quedó desactualizada tras la carrera.
    expect(refetchSlots).toHaveBeenCalled();
  });

  it("una franja propia 'asignado' muestra Confirmar y No podré asistir", async () => {
    mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);

    expect(screen.getByRole("button", { name: "Confirmar asistencia (opcional)" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "No podré asistir" })).toBeInTheDocument();
  });

  it("confirma la franja propia: llama a POST .../confirm", async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue(buildSlot({ status: "confirmado", studentId: "student-1" }));
    mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);
    await user.click(screen.getByRole("button", { name: "Confirmar asistencia (opcional)" }));

    expect(mockedPost).toHaveBeenCalledWith("/practice-slots/slot-1/confirm");
  });

  it("una franja propia 'confirmado' solo muestra No podré asistir (no Confirmar)", async () => {
    mockFetch([buildSlot({ status: "confirmado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);

    expect(screen.queryByRole("button", { name: "Confirmar asistencia (opcional)" })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "No podré asistir" })).toBeInTheDocument();
  });

  it.each(["asignado", "confirmado"] as const)("oculta No podré asistir si la práctica %s ya pasó", (status) => {
    mockFetch([buildSlot({ status, scheduledAt: "2020-03-10T15:00:00.000Z", studentId: "student-1" })]);
    render(<StudentSchedulePage />);
    expect(screen.queryByRole("button", { name: "No podré asistir" })).not.toBeInTheDocument();
  });

  it("consulta la vista previa antes de abrir el formulario de cancelación", async () => {
    const user = userEvent.setup();
    mockedGet.mockResolvedValue({ reprogramacionesRestantes: 1, hayFranjasLibres: false, resultadoSiCancela: "hora_perdida" });
    mockFetch([buildSlot({ status: "confirmado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);
    await user.click(await screen.findByRole("button", { name: "No podré asistir" }));

    expect(mockedGet).toHaveBeenCalledWith("/practice-slots/slot-1/cancel-preview");
    expect(await screen.findByRole("dialog", { name: "Avisar que no asistirás" })).toBeInTheDocument();
    expect(screen.getByText("Te quedan 1 de 2 reprogramaciones.")).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("muestra el error de la vista previa sin abrir un modal", async () => {
    const user = userEvent.setup();
    mockedGet.mockRejectedValue(new ApiError("La matrícula requiere revisión", 409));
    mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);
    await user.click(await screen.findByRole("button", { name: "No podré asistir" }));

    expect(await screen.findByText("La matrícula requiere revisión")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("al cerrar con Escape devuelve el foco al botón Cancelar", async () => {
    const user = userEvent.setup();
    mockedGet.mockResolvedValue({ reprogramacionesRestantes: 2, hayFranjasLibres: true, resultadoSiCancela: "reprogramable" });
    mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);
    const trigger = await screen.findByRole("button", { name: "No podré asistir" });
    await user.click(trigger);
    await screen.findByRole("dialog", { name: "Avisar que no asistirás" });
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("al cancelar refresca y muestra el resultado final de la respuesta, aunque cambie desde la vista previa", async () => {
    const user = userEvent.setup();
    mockedGet.mockResolvedValue({ reprogramacionesRestantes: 1, hayFranjasLibres: true, resultadoSiCancela: "reprogramable" });
    mockedPost.mockResolvedValue({
      ...buildSlot({ status: "liberado", studentId: null }),
      cancelacion: { cancellationId: "c1", enrollmentId: "e1", cancelledAt: "2026-03-01T10:00:00Z", resultado: "hora_perdida", consumioReprogramacion: false, reprogramacionNumero: null, reprogramacionesRestantes: 1 },
    });
    mockFetch([buildSlot({ status: "confirmado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);
    await user.click(await screen.findByRole("button", { name: "No podré asistir" }));
    await screen.findByRole("dialog", { name: "Avisar que no asistirás" });
    await user.selectOptions(screen.getByLabelText("Motivo de inasistencia"), "salud");
    await user.type(screen.getByLabelText("Explica el motivo de inasistencia"), "Cita médica programada");
    await user.click(screen.getByRole("button", { name: "Confirmar que no asistiré" }));

    expect(mockedPost).toHaveBeenCalledWith("/practice-slots/slot-1/cancel", {
      motivoCategoria: "salud", motivoTexto: "Cita médica programada",
    });
    expect(await screen.findByText("Listo, avisamos que no asistirás a esta práctica")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("esta hora se pierde");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(refetchSlots).toHaveBeenCalled();
  });

  it("no muestra como propias las franjas completado/sin_practica (historial fuera de alcance)", () => {
    mockFetch([
      buildSlot({ id: "slot-old", status: "completado", studentId: "student-1" }),
      buildSlot({ id: "slot-missed", status: "sin_practica", studentId: null }),
    ]);

    render(<StudentSchedulePage />);

    expect(screen.getByText("No tienes ninguna franja reclamada todavía.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "No podré asistir" })).not.toBeInTheDocument();
  });

  describe("Realtime", () => {
    it("A+B se suscribe a ambas cohortes propias aunque no haya franjas", async () => {
      const channels = mockSupabaseClient("student-1");
      mockFetch([], { A: "cohort-a", B: "cohort-b" });
      render(<StudentSchedulePage />);
      await waitFor(() => expect(channels.has("cohort-cohort-b-practice-slots")).toBe(true));
      expect(channels.has("cohort-cohort-a-practice-slots")).toBe(true);
      refetchSlots.mockClear();
      act(() => channels.get("cohort-cohort-b-practice-slots")?.emit("slot-released", {}));
      expect(refetchSlots).toHaveBeenCalled();
    });
    it("al liberarse un cupo en el canal de cohorte, refresca la lista", async () => {
      const channels = mockSupabaseClient("student-1");
      mockFetch([buildSlot({ status: "disponible", cohortId: "cohort-1" })]);

      render(<StudentSchedulePage />);
      await waitFor(() => expect(channels.has("cohort-cohort-1-practice-slots")).toBe(true));
      refetchSlots.mockClear(); // limpiar la llamada del render inicial, si la hubo

      act(() => {
        channels.get("cohort-cohort-1-practice-slots")!.emit("slot-released", {
          slotId: "slot-2",
          scheduledAt: "2026-03-11T10:00:00.000Z",
        });
      });

      expect(refetchSlots).toHaveBeenCalled();
    });

    it("al recibir 'confirmation-requested', resalta la franja con Confirmar/Cancelar directamente ahí", async () => {
      const channels = mockSupabaseClient("student-1");
      mockFetch([buildSlot({ status: "asignado", studentId: "student-1", cohortId: "cohort-1" })]);

      render(<StudentSchedulePage />);
      await waitFor(() => expect(channels.has("user-student-1-practice-slots")).toBe(true));

      expect(screen.queryByText(/Tu práctica está por empezar/)).not.toBeInTheDocument();

      act(() => {
        channels
          .get("user-student-1-practice-slots")!
          .emit("confirmation-requested", { scheduledAt: "2026-03-10T15:00:00.000Z" });
      });

      expect(screen.getByText(/Tu práctica está por empezar/)).toBeInTheDocument();
      // Los botones ya estaban ahí (no dependen del evento para existir),
      // pero siguen presentes junto al aviso.
      expect(screen.getByRole("button", { name: "Confirmar asistencia (opcional)" })).toBeInTheDocument();
      expect(await screen.findByRole("button", { name: "No podré asistir" })).toBeInTheDocument();
    });

    it("al recibir 'no-practice', muestra un aviso descartable", async () => {
      const channels = mockSupabaseClient("student-1");
      mockFetch([]);

      render(<StudentSchedulePage />);
      await waitFor(() => expect(channels.has("user-student-1-practice-slots")).toBe(true));

      act(() => {
        channels
          .get("user-student-1-practice-slots")!
          .emit("no-practice", { scheduledAt: "2026-03-10T15:00:00.000Z" });
      });

      expect(
        screen.getByText("Esta práctica ya no se realizará. Consulta tus horarios actualizados."),
      ).toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Entendido" }));

      expect(
        screen.queryByText("Esta práctica ya no se realizará. Consulta tus horarios actualizados."),
      ).not.toBeInTheDocument();
    });

    it("sin franjas todavía, no se suscribe al canal de cohorte (no hay cohortId que derivar)", () => {
      const channels = mockSupabaseClient("student-1");
      mockFetch([]);

      render(<StudentSchedulePage />);

      expect([...channels.keys()].some((name) => name.startsWith("cohort-"))).toBe(false);
    });
  });
});
