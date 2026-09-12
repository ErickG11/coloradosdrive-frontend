import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StudentSchedulePage from "@/app/(student)/student/schedule/page";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useFetch } from "@/hooks/useFetch";
import { createClient } from "@/lib/supabase/client";
import type { PracticeSlotWithNames } from "@/types";

vi.mock("@/hooks/useFetch", () => ({
  useFetch: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  api: {
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
const mockedCreateClient = vi.mocked(createClient);

interface MockChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  emit: (event: string, payload: unknown) => void;
}

function createMockChannel(): MockChannel {
  const listeners = new Map<string, (arg: { payload: unknown }) => void>();
  const channel = {
    on: vi.fn((_type: string, filter: { event: string }, cb: (arg: { payload: unknown }) => void) => {
      listeners.set(filter.event, cb);
      return channel;
    }),
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
    },
  } as unknown as ReturnType<typeof createClient>);
  return channels;
}

function buildSlot(overrides: Partial<PracticeSlotWithNames> = {}): PracticeSlotWithNames {
  return {
    id: "slot-1",
    cohortId: "cohort-1",
    instructorId: "instructor-1",
    studentId: null,
    scheduledAt: "2026-03-10T15:00:00.000Z",
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

function mockFetch(slots: PracticeSlotWithNames[]) {
  mockedUseFetch.mockImplementation((path: unknown) => {
    if (path === "/practice-slots") {
      return { data: slots, isLoading: false, error: null, refetch: refetchSlots };
    }
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
    expect(screen.getByText("No hay franjas disponibles en tu cohorte por ahora.")).toBeInTheDocument();
  });

  it("lista las franjas disponibles con el nombre del instructor", () => {
    mockFetch([buildSlot({ status: "disponible" })]);

    render(<StudentSchedulePage />);

    expect(screen.getByText(/Bruno Salas/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reclamar" })).toBeInTheDocument();
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

  it("una franja propia 'asignado' muestra Confirmar y Cancelar", () => {
    mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);

    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("confirma la franja propia: llama a POST .../confirm", async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue(buildSlot({ status: "confirmado", studentId: "student-1" }));
    mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(mockedPost).toHaveBeenCalledWith("/practice-slots/slot-1/confirm");
  });

  it("una franja propia 'confirmado' solo muestra Cancelar (no Confirmar)", () => {
    mockFetch([buildSlot({ status: "confirmado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);

    expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("cancela la franja propia incluso ya confirmada: llama a POST .../cancel", async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue(buildSlot({ status: "liberado", studentId: null }));
    mockFetch([buildSlot({ status: "confirmado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(mockedPost).toHaveBeenCalledWith("/practice-slots/slot-1/cancel");
  });

  it("no muestra como propias las franjas completado/sin_practica (historial fuera de alcance)", () => {
    mockFetch([
      buildSlot({ id: "slot-old", status: "completado", studentId: "student-1" }),
      buildSlot({ id: "slot-missed", status: "sin_practica", studentId: null }),
    ]);

    render(<StudentSchedulePage />);

    expect(screen.getByText("No tienes ninguna franja reclamada todavía.")).toBeInTheDocument();
  });

  describe("Realtime", () => {
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
      await waitFor(() =>
        expect(channels.has("user-student-1-practice-slots")).toBe(true),
      );

      expect(screen.queryByText(/Tu práctica está por empezar/)).not.toBeInTheDocument();

      act(() => {
        channels
          .get("user-student-1-practice-slots")!
          .emit("confirmation-requested", { scheduledAt: "2026-03-10T15:00:00.000Z" });
      });

      expect(screen.getByText(/Tu práctica está por empezar/)).toBeInTheDocument();
      // Los botones ya estaban ahí (no dependen del evento para existir),
      // pero siguen presentes junto al aviso.
      expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    });

    it("al recibir 'no-practice', muestra un aviso descartable", async () => {
      const channels = mockSupabaseClient("student-1");
      mockFetch([]);

      render(<StudentSchedulePage />);
      await waitFor(() =>
        expect(channels.has("user-student-1-practice-slots")).toBe(true),
      );

      act(() => {
        channels
          .get("user-student-1-practice-slots")!
          .emit("no-practice", { scheduledAt: "2026-03-10T15:00:00.000Z" });
      });

      expect(
        screen.getByText('Tu franja pasó a "sin práctica" porque no se confirmó a tiempo.'),
      ).toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Entendido" }));

      expect(
        screen.queryByText('Tu franja pasó a "sin práctica" porque no se confirmó a tiempo.'),
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
