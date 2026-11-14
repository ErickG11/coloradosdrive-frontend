import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StudentSchedulePage from "@/app/(student)/student/schedule/page";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useFetch } from "@/hooks/useFetch";
import { createClient } from "@/lib/supabase/client";
import { dayKey } from "@/app/(student)/student/schedule/scheduleModel";
import type { PracticeSlotWithNames, StudentPracticeSlot } from "@/types";
import type { PracticeBlockOption, PracticeBlockSummary } from "@/types/practiceBlock";

vi.mock("@/hooks/useFetch", () => ({
  useFetch: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// El contexto lo provee el layout (PracticeBlockProvider); aquí se controla desde cada prueba.
const availability = {
  summary: null as PracticeBlockSummary | null,
  options: [] as PracticeBlockOption[],
  loading: false,
  summaryError: null as string | null,
  optionsError: null as string | null,
  refresh: vi.fn(),
};
vi.mock("@/components/practice-blocks/PracticeBlockProvider", () => ({
  usePracticeBlocks: () => availability,
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

const summary: PracticeBlockSummary = {
  enrollments: [
    {
      id: "enrollment-1",
      cohortId: "cohort-1",
      used: 1,
      remaining: 1,
      targetHours: 10,
      endDate: "2027-01-31",
      reservedHours: 2,
      attendedHours: 0,
      pending: [],
      absences: [],
    },
  ],
};

function releasedOption(overrides: Partial<PracticeBlockOption> = {}): PracticeBlockOption {
  const start = Date.now() + 48 * 60 * 60 * 1000;
  return {
    id: "option-1",
    enrollmentId: "enrollment-1",
    cohortId: "cohort-1",
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + 60 * 60 * 1000).toISOString(),
    hours: 1,
    instructorId: "instructor-1",
    instructorName: "Bruno Salas",
    kind: "released",
    sourceDate: null,
    sourceStartsAt: null,
    pendingId: null,
    cost: 1,
    remaining: 1,
    ...overrides,
  };
}

function mockFetch(slots: StudentPracticeSlot[], cohorts: string[] = ["cohort-1"]) {
  mockedUseFetch.mockImplementation((path: unknown) => {
    if (path === "/practice-slots") {
      return { data: slots, isLoading: false, error: null, refetch: refetchSlots };
    }
    if (path === "/estudiantes/enrollments") {
      return {
        data: cohorts.map((cohortId) => ({ cohortId, courseType: "B" })),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    }
    if (path === "/estudiantes/practice-history/enrollments") {
      return { data: [], isLoading: false, error: null, refetch: vi.fn() };
    }
    throw new Error(`useFetch mockeado con un path inesperado: ${String(path)}`);
  });
}

const resolutionPreview = {
  block: {},
  started: false,
  late: false,
  used: 1,
  remaining: 1,
  canMove: false,
  moveReason: "no hay horas libres ese día.",
  freeHours: [],
  effectMove: "",
  effectAbsence: "Se registrará una falta y esta hora se pierde.",
};

// Todas las rutas GET de la página comparten api.get: el plan y la vista previa se distinguen por la URL.
function mockApiGet(preview: unknown = resolutionPreview) {
  mockedGet.mockImplementation((path: string) => {
    if (path.includes("/resolution-preview")) {
      return preview instanceof Error ? Promise.reject(preview) : Promise.resolve(preview);
    }
    return Promise.resolve(undefined);
  });
}

describe("StudentSchedulePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGet.mockReset();
    mockApiGet();
    availability.summary = summary;
    availability.options = [];
    availability.loading = false;
    availability.summaryError = null;
    availability.optionsError = null;
    // Valor por defecto inerte para las pruebas que no usan Realtime; las de Realtime
    // vuelven a llamar a mockSupabaseClient() y capturan el mapa de canales.
    mockSupabaseClient("student-1");
  });

  async function ready() {
    // La hora actual se carga tras el primer render: hasta entonces las acciones están deshabilitadas.
    await waitFor(() =>
      expect(screen.queryByText("Consultando el horario…")).not.toBeInTheDocument(),
    );
  }

  it("muestra un mensaje cuando no tiene prácticas asignadas", () => {
    mockFetch([]);

    render(<StudentSchedulePage />);

    expect(screen.getByText("Aún no tienes prácticas asignadas")).toBeInTheDocument();
    expect(
      screen.getByText("Tu agenda está al día. Aquí aparecerán tus próximas prácticas."),
    ).toBeInTheDocument();
  });

  it("no muestra como propias las franjas libres de la cohorte", () => {
    mockFetch([buildSlot({ status: "disponible", studentId: null })]);

    render(<StudentSchedulePage />);

    expect(screen.getByText("Aún no tienes prácticas asignadas")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "No podré asistir" })).not.toBeInTheDocument();
  });

  it("muestra el instructor de una práctica propia ya asignada", () => {
    mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);

    expect(screen.getByText("Tu próxima práctica")).toBeInTheDocument();
    expect(screen.getAllByText("Bruno Salas").length).toBeGreaterThan(0);
  });

  it("no muestra como próximas las prácticas completadas ni sin práctica", () => {
    mockFetch([
      buildSlot({ id: "slot-old", status: "completado", studentId: "student-1" }),
      buildSlot({ id: "slot-missed", status: "sin_practica", studentId: "student-1" }),
    ]);

    render(<StudentSchedulePage />);

    expect(screen.getByText("Aún no tienes prácticas asignadas")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "No podré asistir" })).not.toBeInTheDocument();
  });

  it("una práctica 'asignado' ofrece confirmar (opcional) y avisar que no asistirá", async () => {
    mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);
    await ready();

    expect(screen.getByRole("button", { name: "Confirmo que asistiré" })).toBeEnabled();
    expect(screen.getAllByRole("button", { name: "No podré asistir" }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Opcional: si no confirmas, igual te esperamos/)).toBeInTheDocument();
  });

  it("una práctica 'confirmado' solo ofrece avisar que no asistirá", async () => {
    mockFetch([buildSlot({ status: "confirmado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);
    await ready();

    expect(screen.queryByRole("button", { name: "Confirmo que asistiré" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "No podré asistir" }).length).toBeGreaterThan(0);
  });

  it("confirma el bloque completo del día: POST .../blocks/:matrícula/:fecha/confirm", async () => {
    const user = userEvent.setup();
    const slot = buildSlot({ status: "asignado", studentId: "student-1" });
    mockedPost.mockResolvedValue({});
    mockFetch([slot]);

    render(<StudentSchedulePage />);
    await ready();
    await user.click(screen.getByRole("button", { name: "Confirmo que asistiré" }));

    expect(mockedPost).toHaveBeenCalledWith(
      `/practice-slots/blocks/enrollment-1/${dayKey(slot.scheduledAt)}/confirm`,
    );
    expect(
      await screen.findByText("Listo, confirmaste tu asistencia. ¡Te esperamos!"),
    ).toBeInTheDocument();
    expect(refetchSlots).toHaveBeenCalled();
  });

  it("muestra el motivo si no se puede confirmar y no llama a la API", async () => {
    mockedPost.mockRejectedValue(new ApiError("No puedes confirmar esta práctica.", 409));
    const user = userEvent.setup();
    mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);
    await ready();
    await user.click(screen.getByRole("button", { name: "Confirmo que asistiré" }));

    expect(await screen.findByText("No puedes confirmar esta práctica.")).toBeInTheDocument();
  });

  it.each(["asignado", "confirmado"] as const)(
    "no ofrece avisar inasistencia si la práctica %s ya pasó",
    async (status) => {
      mockFetch([
        buildSlot({ status, scheduledAt: "2020-03-10T15:00:00.000Z", studentId: "student-1" }),
      ]);

      render(<StudentSchedulePage />);

      // Hasta conocer la hora actual la página no sabe que ya pasó; luego la mueve a «Anteriores».
      await waitFor(() => expect(screen.queryByText("Tu próxima práctica")).not.toBeInTheDocument());
      expect(screen.queryByRole("button", { name: "No podré asistir" })).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Confirmo que asistiré" }),
      ).not.toBeInTheDocument();
    },
  );

  it("las prácticas pasadas quedan en «Anteriores»", () => {
    mockFetch([
      buildSlot({
        id: "slot-old",
        status: "completado",
        scheduledAt: "2020-03-10T15:00:00.000Z",
        studentId: "student-1",
      }),
    ]);

    render(<StudentSchedulePage />);

    expect(screen.getByText("Anteriores")).toBeInTheDocument();
    expect(screen.getByText("(1)")).toBeInTheDocument();
  });

  describe("avisar que no asistirá (un solo paso)", () => {
    async function openDialog(user: ReturnType<typeof userEvent.setup>) {
      mockFetch([buildSlot({ status: "confirmado", studentId: "student-1" })]);
      render(<StudentSchedulePage />);
      await ready();
      const trigger = screen.getAllByRole("button", { name: "No podré asistir" })[0];
      await user.click(trigger);
      return trigger;
    }

    it("consulta la vista previa de resolución antes de mostrar el formulario", async () => {
      const user = userEvent.setup();
      await openDialog(user);

      const dialog = await screen.findByRole("dialog", { name: "Avisar que no asistirás" });
      await within(dialog).findByText("Se registrará una falta y esta hora se pierde.");
      expect(mockedGet).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\/practice-slots\/blocks\/enrollment-1\/\d{4}-\d{2}-\d{2}\/resolution-preview$/,
        ),
      );
      expect(
        within(dialog).getByText(/No puedes cambiar de hora: no hay horas libres ese día\./),
      ).toBeInTheDocument();
      expect(mockedPost).not.toHaveBeenCalled();
    });

    it("muestra el error de la vista previa y permite volver a consultar", async () => {
      const user = userEvent.setup();
      mockApiGet(new ApiError("La matrícula requiere revisión", 409));
      await openDialog(user);

      const dialog = await screen.findByRole("dialog", { name: "Avisar que no asistirás" });
      expect(await within(dialog).findByText("La matrícula requiere revisión")).toBeInTheDocument();
      expect(
        within(dialog).getByRole("button", { name: "Volver a consultar" }),
      ).toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    });

    it("si el bloque ya comenzó no permite avisar desde la plataforma", async () => {
      const user = userEvent.setup();
      mockApiGet({ ...resolutionPreview, started: true });
      await openDialog(user);

      const dialog = await screen.findByRole("dialog", { name: "Avisar que no asistirás" });
      expect(
        await within(dialog).findByText(/ya comenzó y no se puede avisar desde la plataforma/),
      ).toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    });

    it("al cerrar con Escape devuelve el foco al botón que lo abrió", async () => {
      const user = userEvent.setup();
      const trigger = await openDialog(user);
      await screen.findByRole("dialog", { name: "Avisar que no asistirás" });
      await user.keyboard("{Escape}");

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await waitFor(() => expect(trigger).toHaveFocus());
    });

    it("registra la falta con motivo y muestra el efecto devuelto por el servidor", async () => {
      const user = userEvent.setup();
      mockedPost.mockResolvedValue({
        cohortId: "cohort-1",
        action: "falta",
        result: "falta",
        used: 1,
        remaining: 1,
        effect: "Listo, registramos tu falta de ese día.",
      });
      await openDialog(user);
      const dialog = await screen.findByRole("dialog", { name: "Avisar que no asistirás" });
      await within(dialog).findByText("Se registrará una falta y esta hora se pierde.");

      await user.selectOptions(within(dialog).getByLabelText("Motivo de inasistencia"), "salud");
      await user.type(
        within(dialog).getByLabelText("Explica el motivo de inasistencia"),
        "Cita médica programada",
      );
      await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

      expect(mockedPost).toHaveBeenCalledWith(
        expect.stringMatching(
          /\/practice-slots\/blocks\/enrollment-1\/\d{4}-\d{2}-\d{2}\/resolve$/,
        ),
        { accion: "falta", motivoCategoria: "salud", motivoTexto: "Cita médica programada" },
      );
      expect(
        await screen.findByText("Listo, registramos tu falta de ese día."),
      ).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(refetchSlots).toHaveBeenCalled();
      expect(availability.refresh).toHaveBeenCalled();
    });

    it("exige motivo y explicación de al menos 10 caracteres para confirmar", async () => {
      const user = userEvent.setup();
      await openDialog(user);
      const dialog = await screen.findByRole("dialog", { name: "Avisar que no asistirás" });
      await within(dialog).findByText("Se registrará una falta y esta hora se pierde.");

      expect(within(dialog).getByRole("button", { name: "Confirmar" })).toBeDisabled();
      await user.selectOptions(within(dialog).getByLabelText("Motivo de inasistencia"), "salud");
      await user.type(within(dialog).getByLabelText("Explica el motivo de inasistencia"), "corto");
      expect(within(dialog).getByRole("button", { name: "Confirmar" })).toBeDisabled();
    });
  });

  describe("cupos disponibles", () => {
    async function openAvailable(user: ReturnType<typeof userEvent.setup>) {
      render(<StudentSchedulePage />);
      await ready();
      await user.click(screen.getByRole("button", { name: /Cupos disponibles/ }));
    }

    it("sin cupos liberados lo indica", async () => {
      mockFetch([]);
      await openAvailable(userEvent.setup());

      expect(screen.getByText(/No hay cupos liberados por ahora\./)).toBeInTheDocument();
    });

    it("lista solo cupos liberados por otros alumnos con su instructor", async () => {
      availability.options = [
        releasedOption(),
        releasedOption({ id: "option-2", kind: "instructor_free", instructorName: "Otra Persona" }),
      ];
      mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);
      await openAvailable(userEvent.setup());

      expect(screen.getAllByRole("button", { name: "Tomar cupo" })).toHaveLength(1);
      expect(screen.getAllByText(/Bruno Salas/).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Otra Persona/)).not.toBeInTheDocument();
      expect(screen.getByText(/consume 1 reprogramación; te quedará 1/)).toBeInTheDocument();
    });

    it("toma el cupo con POST .../take, avisa y refresca las listas", async () => {
      const user = userEvent.setup();
      mockedPost.mockResolvedValue({});
      availability.options = [releasedOption()];
      mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);
      await openAvailable(user);

      await user.click(screen.getByRole("button", { name: "Tomar cupo" }));
      const dialog = await screen.findByRole("dialog", { name: "Confirmar cambio de bloque" });
      await user.click(within(dialog).getByRole("button", { name: "Confirmar cambio" }));

      expect(mockedPost).toHaveBeenCalledWith("/practice-slots/blocks/enrollment-1/take", {
        optionId: "option-1",
      });
      expect(
        await screen.findByText("Listo, cambiaste tu bloque por el cupo liberado."),
      ).toBeInTheDocument();
      expect(refetchSlots).toHaveBeenCalled();
      expect(availability.refresh).toHaveBeenCalled();
    });

    it("muestra el error si otro alumno tomó el cupo", async () => {
      const user = userEvent.setup();
      mockedPost.mockRejectedValue(
        new ApiError("Otro alumno tomó este cupo o ya no está disponible", 409),
      );
      availability.options = [releasedOption()];
      mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);
      await openAvailable(user);

      await user.click(screen.getByRole("button", { name: "Tomar cupo" }));
      const dialog = await screen.findByRole("dialog", { name: "Confirmar cambio de bloque" });
      await user.click(within(dialog).getByRole("button", { name: "Confirmar cambio" }));

      expect(
        await within(dialog).findByText("Otro alumno tomó este cupo o ya no está disponible"),
      ).toBeInTheDocument();
    });
  });

  describe("Realtime del alumno", () => {
    it("al recibir slots-updated refresca las prácticas y los cupos", async () => {
      const channels = mockSupabaseClient("student-1");
      mockFetch([]);
      render(<StudentSchedulePage />);
      await waitFor(() => expect(channels.has("user-student-1-practice-slots")).toBe(true));
      refetchSlots.mockClear();
      availability.refresh.mockClear();

      act(() => channels.get("user-student-1-practice-slots")?.emit("slots-updated", {}));

      expect(refetchSlots).toHaveBeenCalled();
      expect(availability.refresh).toHaveBeenCalled();
    });

    it("al recibir 'confirmation-requested' muestra el aviso junto a las acciones", async () => {
      const channels = mockSupabaseClient("student-1");
      mockFetch([buildSlot({ status: "asignado", studentId: "student-1", cohortId: "cohort-1" })]);

      render(<StudentSchedulePage />);
      await waitFor(() => expect(channels.has("user-student-1-practice-slots")).toBe(true));
      expect(screen.queryByText(/Tu práctica está por empezar/)).not.toBeInTheDocument();

      act(() => {
        channels
          .get("user-student-1-practice-slots")
          ?.emit("confirmation-requested", { scheduledAt: "2026-03-10T15:00:00.000Z" });
      });

      expect(screen.getByText(/Tu práctica está por empezar/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Confirmo que asistiré" })).toBeInTheDocument();
    });

    it("al recibir 'no-practice' muestra un aviso descartable", async () => {
      const channels = mockSupabaseClient("student-1");
      mockFetch([]);

      render(<StudentSchedulePage />);
      await waitFor(() => expect(channels.has("user-student-1-practice-slots")).toBe(true));
      act(() => {
        channels
          .get("user-student-1-practice-slots")
          ?.emit("no-practice", { scheduledAt: "2026-03-10T15:00:00.000Z" });
      });

      const notice = "Esta práctica ya no se realizará. Consulta tus horarios actualizados.";
      expect(screen.getByText(notice)).toBeInTheDocument();
      await userEvent.setup().click(screen.getByRole("button", { name: "Entendido" }));
      expect(screen.queryByText(notice)).not.toBeInTheDocument();
    });

    it("la página no se suscribe a canales de cohorte (lo hace PracticeBlockProvider)", () => {
      const channels = mockSupabaseClient("student-1");
      mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);

      render(<StudentSchedulePage />);

      expect([...channels.keys()].some((name) => name.startsWith("cohort-"))).toBe(false);
    });
  });
});
