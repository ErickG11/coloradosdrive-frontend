import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import InstructorPage from "@/app/(instructor)/instructor/page";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { PracticeSlotWithNames } from "@/types";

vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), patch: vi.fn() } }));
// Parámetros de la URL que ve la agenda (?fecha=AAAA-MM-DD).
const search = vi.hoisted(() => ({ value: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search.value) }));

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

const rangePath = (from: string, to: string) =>
  `/practice-slots?${new URLSearchParams({ from, to })}`;
const currentPath = rangePath("2026-03-09T05:00:00.000Z", "2026-03-16T05:00:00.000Z");

// La agenda hace dos consultas: las franjas de la semana y cómo se agrupan en
// bloques. El mock responde según la URL para no mezclar una con otra.
const isBlocksPath = (path: string) => path.startsWith("/practice-slots/blocks/instructor-groups?");
const blocksPath = (from: string, to: string) =>
  `/practice-slots/blocks/instructor-groups?${new URLSearchParams({ from, to })}`;
let slotQueue: (() => Promise<PracticeSlotWithNames[]>)[] = [];
let slotDefault: PracticeSlotWithNames[] = [];
let blocksReply: () => Promise<unknown> = () => Promise.resolve([]);
const slotsOnce = (rows: PracticeSlotWithNames[]) => slotQueue.push(() => Promise.resolve(rows));
const slotsFailOnce = (error: unknown) => slotQueue.push(() => Promise.reject(error));
// Solo las consultas de franjas, en orden.
const slotCalls = () => get.mock.calls.map(([path]) => path).filter((path) => !isBlocksPath(path));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-10T15:00:00Z"));
  search.value = "";
  slotQueue = [];
  slotDefault = [slot];
  blocksReply = () => Promise.resolve([]);
  get.mockImplementation(((path: string) =>
    isBlocksPath(path)
      ? blocksReply()
      : (slotQueue.shift()?.() ?? Promise.resolve(slotDefault))) as typeof api.get);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function desktop() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(min-width: 768px)",
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

describe("calendario semanal y detalle", () => {
  const second = {
    ...slot,
    id: "slot-2",
    scheduledAt: "2026-03-10T16:00:00Z",
    courseType: "A" as const,
  };
  const definition = { id: "block-1", slotIds: ["slot-1", "slot-2"] };

  it("en escritorio abre Semana y dos horas ocupan dos filas antes del bloque siguiente", async () => {
    desktop();
    slotsOnce([
      { ...slot, courseType: "A" },
      second,
      { ...slot, id: "next", scheduledAt: "2026-03-10T17:00:00Z", courseType: "B" },
    ]);
    blocksReply = () => Promise.resolve([definition]);
    render(<InstructorPage />);
    const block = await screen.findByRole("article", { name: "Bloque 10:00 – 12:00" });
    expect(screen.getByRole("button", { name: "Semana" })).toHaveAttribute("aria-pressed", "true");
    const region = screen.getByRole("region", { name: "Calendario semanal de 06:00 a 22:00" });
    expect(within(region).getAllByRole("article")).toHaveLength(2);
    expect(within(block).getByText("Ana Torres")).toBeInTheDocument();
    expect(within(block).getByText("Tipo A")).toBeInTheDocument();
    const position = block.closest("[data-duration-minutes]") as HTMLElement;
    expect(position.dataset.durationMinutes).toBe("120");
    expect(position.style.top).toBe("25%");
    expect(position.style.height).toBe("calc(12.5% - 8px)");
    const next = screen
      .getByRole("article", { name: "Bloque 12:00 – 13:00" })
      .closest("[data-duration-minutes]") as HTMLElement;
    expect(next.style.top).toBe("37.5%");
    expect(within(region).getByText("06:00")).toBeInTheDocument();
    expect(within(region).getByText("22:00")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ahora, 10:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Martes 10 de marzo/ })).toHaveAttribute(
      "aria-current",
      "date",
    );
  });

  it("Día es la vista inicial en pantallas pequeñas y permite cambiar a Semana sin consultar de nuevo", async () => {
    const user = userEvent.setup();
    render(<InstructorPage />);
    await screen.findByRole("article");
    expect(screen.getByRole("button", { name: "Día" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Semana" }));
    expect(
      screen.getByRole("region", { name: "Calendario semanal de 06:00 a 22:00" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Día" }));
    expect(screen.getByRole("region", { name: "Agenda del día" })).toBeInTheDocument();
    expect(slotCalls()).toHaveLength(1);
  });

  it.each([
    ["A", "Tipo A"],
    ["B", "Tipo B"],
    [undefined, "Tipo sin información"],
  ] as const)("muestra %s con texto", async (courseType, label) => {
    slotsOnce([{ ...slot, courseType }]);
    render(<InstructorPage />);
    expect(within(await screen.findByRole("article")).getByText(label)).toBeInTheDocument();
  });

  it("abre el detalle con alumno, cohorte y horas; Escape devuelve el foco", async () => {
    vi.setSystemTime(new Date("2026-03-10T18:00:00Z"));
    slotsOnce([{ ...slot, courseType: "A", cohortName: "Motos marzo" }, second]);
    blocksReply = () => Promise.resolve([definition]);
    const user = userEvent.setup();
    render(<InstructorPage />);
    const trigger = await screen.findByRole("button", {
      name: "Ver bloque de Ana Torres, 10:00 – 12:00",
    });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Detalle del bloque" });
    expect(dialog).toHaveFocus();
    for (const text of [
      "Ana Torres",
      "Tipo A",
      "Motos marzo",
      "10:00 – 12:00",
      "2 h",
      "Realizada",
    ]) {
      expect(within(dialog).getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(within(dialog).getByRole("link", { name: "Ir a asistencias" })).toHaveAttribute(
      "href",
      "/instructor/asistencias?fecha=2026-03-10&bloque=block-1",
    );
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("no ofrece asistencia en horas futuras ni controles para guardar", async () => {
    slotsOnce([
      {
        ...slot,
        status: "confirmado",
      } as PracticeSlotWithNames,
    ]);
    const user = userEvent.setup();
    render(<InstructorPage />);
    await screen.findByRole("article");
    await user.click(screen.getByRole("button", { name: /Ver bloque de Ana/ }));
    expect(screen.queryByRole("link", { name: "Ir a asistencias" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^(Asistió|No asistió|Guardar confirmación)$/ }),
    ).not.toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();
  });

  it("resume bloques y horario y cuenta solo horas completadas, terminadas y pendientes", async () => {
    vi.setSystemTime(new Date("2026-03-10T18:00:00Z"));
    slotsOnce([
      slot,
      second,
      { ...slot, id: "recorded", scheduledAt: "2026-03-10T13:00:00Z", attended: true },
      { ...slot, id: "not-completed", scheduledAt: "2026-03-10T12:00:00Z", status: "confirmado" },
      { ...slot, id: "free", studentId: null, studentName: null, status: "disponible" },
      { ...slot, id: "future", scheduledAt: "2026-03-10T20:00:00Z" },
    ]);
    blocksReply = () => Promise.resolve([definition]);
    render(<InstructorPage />);
    await screen.findAllByRole("article");
    const summary = screen.getByLabelText("Resumen del día");
    expect(within(summary).getByText("4")).toBeInTheDocument();
    expect(within(summary).getByText("07:00 – 16:00")).toBeInTheDocument();
    expect(
      within(summary).getByRole("link", { name: "2 asistencias pendientes de registrar" }),
    ).toHaveAttribute("href", "/instructor/asistencias?fecha=2026-03-10");
  });

  it("refresca al enfocar y por avisos sin perder el día seleccionado", async () => {
    const user = userEvent.setup();
    render(<InstructorPage />);
    await screen.findByRole("article");
    await user.click(screen.getByRole("button", { name: /Lunes 9 de marzo/ }));
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(slotCalls()).toHaveLength(2));
    await waitFor(() => expect(screen.queryByText("Cargando horario…")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Lunes 9 de marzo" })).toBeInTheDocument();
    act(() => window.dispatchEvent(new Event("practice-notifications-updated")));
    await waitFor(() => expect(slotCalls()).toHaveLength(3));
  });

  it("la línea de ahora se actualiza al volver y desaparece fuera del horario", async () => {
    desktop();
    render(<InstructorPage />);
    await screen.findByRole("img", { name: "Ahora, 10:00" });
    act(() => {
      vi.setSystemTime(new Date("2026-03-10T16:30:00Z"));
      window.dispatchEvent(new Event("focus"));
    });
    expect(screen.getByRole("img", { name: "Ahora, 11:30" })).toBeInTheDocument();
    act(() => {
      vi.setSystemTime(new Date("2026-03-11T04:00:00Z"));
      window.dispatchEvent(new Event("focus"));
    });
    expect(screen.queryByRole("img", { name: /^Ahora,/ })).not.toBeInTheDocument();
  });

  it("muestra las horas fuera de la retícula también en Semana", async () => {
    desktop();
    slotsOnce([{ ...slot, scheduledAt: "2026-03-10T04:30:00Z" }]);
    render(<InstructorPage />);
    const outside = await screen.findByRole("region", {
      name: "Bloques fuera del horario del calendario",
    });
    expect(within(outside).getByRole("article")).toHaveTextContent("23:30 – 00:30");
  });
});

describe("agenda diaria del instructor", () => {
  it("abre en hoy, pide solo la semana y muestra el selector L M X J V S D", async () => {
    render(<InstructorPage />);
    expect(slotCalls()).toEqual([currentPath]);
    expect(get).toHaveBeenCalledWith(blocksPath("2026-03-09", "2026-03-15"));
    expect(get).toHaveBeenCalledTimes(2);
    expect(await screen.findAllByText("Ana Torres")).not.toHaveLength(0);
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
    expect(days[1]).toHaveAccessibleName("Martes 10 de marzo, 1 bloques con alumno, hoy");
    expect(screen.getAllByText("10:00 – 11:00").length).toBeGreaterThan(0);
    expect(screen.queryByText("Mis datos")).not.toBeInTheDocument();
    expect(get.mock.calls.every(([path]) => path.startsWith("/practice-slots"))).toBe(true);
  });

  it("cambia de día sin pedir de nuevo la semana y ordena por hora", async () => {
    slotsOnce([
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
    await screen.findAllByText("Ana Torres");
    await user.click(
      screen.getByRole("button", { name: "Lunes 9 de marzo, 2 bloques con alumno" }),
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
    expect(slotCalls()).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: /Miércoles 11 de marzo/ }));
    expect(screen.getByText("No tienes bloques este día.")).toBeInTheDocument();
  });

  it("navega por semanas, conserva el día de semana y mantiene los datos mientras carga", async () => {
    let resolve!: (rows: PracticeSlotWithNames[]) => void;
    slotsOnce([slot]);
    slotQueue.push(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const user = userEvent.setup();
    render(<InstructorPage />);
    await screen.findAllByText("Ana Torres");
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));
    expect(slotCalls().at(-1)).toBe(
      rangePath("2026-03-16T05:00:00.000Z", "2026-03-23T05:00:00.000Z"),
    );
    expect(screen.getByRole("heading", { name: "Martes 10 de marzo" })).toBeInTheDocument();
    expect(screen.getAllByText("Ana Torres")).not.toHaveLength(0);
    expect(screen.getByText("Cargando horario…")).toBeInTheDocument();
    await act(async () => resolve([]));
    expect(screen.getByText("16 - 22 de marzo, 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Martes 17 de marzo" })).toBeInTheDocument();
    expect(screen.getByText("No tienes bloques este día.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Semana anterior" }));
    expect(slotCalls().at(-1)).toBe(currentPath);
    expect(await screen.findAllByText("Ana Torres")).not.toHaveLength(0);
  });

  it("mantiene la semana y el día ante un error, y permite reintentar con Hoy", async () => {
    slotsOnce([slot]);
    slotsFailOnce(new ApiError("Sin conexión", 503));
    slotsOnce([]);
    const user = userEvent.setup();
    render(<InstructorPage />);
    await screen.findAllByText("Ana Torres");
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión");
    expect(screen.getByText("9 - 15 de marzo, 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Martes 10 de marzo" })).toBeInTheDocument();
    expect(screen.getAllByText("Ana Torres")).not.toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Hoy" }));
    expect(slotCalls().at(-1)).toBe(currentPath);
    expect(await screen.findByText("No tienes bloques este día.")).toBeInTheDocument();
  });

  it("muestra carga y error inicial sin presentar datos de otra pantalla", async () => {
    slotsFailOnce(new Error("network"));
    render(<InstructorPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando horario");
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo consultar el horario");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it.each([
    ["disponible", "Libre", false],
    ["liberado", "Libre", false],
    ["asignado", "Reservada", true],
    ["confirmado", "Confirmada", true],
    ["completado", "Realizada", true],
    ["sin_practica", "Sin alumno", false],
  ] as const)(
    "traduce %s a %s sin acciones de asistencia en la agenda",
    async (status, label, hasStudent) => {
      slotsOnce([
        {
          ...slot,
          status,
          studentId: hasStudent ? slot.studentId : null,
          studentName: hasStudent ? slot.studentName : null,
        },
      ]);
      render(<InstructorPage />);
      const row = await screen.findByRole("article");
      expect(within(row).getAllByText(label).length).toBeGreaterThan(0);
      expect(
        within(row).getAllByText(
          hasStudent ? "Ana Torres" : status === "sin_practica" ? "Sin alumno" : "Libre",
        ).length,
      ).toBeGreaterThan(0);
      expect(screen.queryAllByRole("button", { name: "Asistió" })).toHaveLength(0);
      expect(
        screen.getByRole("button", {
          name: new RegExp(`Martes 10 de marzo, ${hasStudent ? 1 : 0} bloques con alumno`),
        }),
      ).toBeInTheDocument();
    },
  );
});

describe("fecha en la URL", () => {
  const nextWeek = rangePath("2026-03-16T05:00:00.000Z", "2026-03-23T05:00:00.000Z");

  it("abre la semana y el día de ?fecha", async () => {
    search.value = "fecha=2026-03-19";
    slotsOnce([{ ...slot, scheduledAt: "2026-03-19T15:00:00.000Z" }]);
    render(<InstructorPage />);
    expect(await screen.findByRole("heading", { name: "Jueves 19 de marzo" })).toBeInTheDocument();
    expect(slotCalls()).toEqual([nextWeek]);
    expect(get).toHaveBeenCalledWith(blocksPath("2026-03-16", "2026-03-22"));
    expect(screen.getByText("16 - 22 de marzo, 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Jueves 19 de marzo/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("article")).toHaveTextContent("10:00 – 11:00");
  });

  it.each(["fecha=2026-02-30", "fecha=19-03-2026", "fecha=2026-3-9", "fecha=hola", "fecha="])(
    "ignora %s y abre hoy",
    async (query) => {
      search.value = query;
      render(<InstructorPage />);
      expect(await screen.findAllByText("Ana Torres")).not.toHaveLength(0);
      expect(slotCalls()).toEqual([currentPath]);
      expect(screen.getByRole("heading", { name: "Martes 10 de marzo" })).toBeInTheDocument();
    },
  );

  it("cambia de día si llega otra fecha con la agenda ya abierta", async () => {
    const { rerender } = render(<InstructorPage />);
    await screen.findAllByText("Ana Torres");
    search.value = "fecha=2026-03-19";
    slotsOnce([]);
    rerender(<InstructorPage />);
    expect(await screen.findByRole("heading", { name: "Jueves 19 de marzo" })).toBeInTheDocument();
    expect(slotCalls()).toEqual([currentPath, nextWeek]);
  });
});

describe("bloques de la agenda", () => {
  const second = { ...slot, id: "slot-2", scheduledAt: "2026-03-10T16:00:00.000Z" };
  const block = {
    id: "block-1",
    slotIds: ["slot-1", "slot-2"],
    startsAt: slot.scheduledAt,
    endsAt: "2026-03-10T17:00:00.000Z",
    hours: 2,
  };
  const notice =
    "No se pudieron agrupar las horas en bloques. Se muestran las franjas por separado.";

  it("agrupa las horas del mismo bloque y no muestra el aviso", async () => {
    slotsOnce([slot, second]);
    blocksReply = () => Promise.resolve([block]);
    render(<InstructorPage />);
    expect(
      await screen.findByRole("article", { name: "Bloque 10:00 – 12:00" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Martes 10 de marzo, 1 bloques con alumno, hoy" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(notice)).not.toBeInTheDocument();
  });

  it.each([
    ["la consulta falla", () => Promise.reject(new ApiError("Sin conexión", 503))],
    ["la respuesta no es un arreglo", () => Promise.resolve({ blocks: [] })],
    ["la respuesta llega vacía", () => Promise.resolve(undefined)],
    ["un bloque no trae slotIds", () => Promise.resolve([{ id: "block-1" }])],
    ["slotIds no es un arreglo", () => Promise.resolve([{ ...block, slotIds: "slot-1" }])],
  ])("si %s, igual muestra las franjas por hora con un aviso discreto", async (_label, reply) => {
    slotsOnce([slot, second]);
    blocksReply = reply;
    render(<InstructorPage />);
    const rows = await screen.findAllByRole("article");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("10:00 – 11:00");
    expect(rows[1]).toHaveTextContent("11:00 – 12:00");
    expect(screen.getByRole("article", { name: "Bloque 10:00 – 11:00" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Bloque 11:00 – 12:00" })).toBeInTheDocument();
    expect(screen.getByText(notice)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("quita el aviso cuando los bloques vuelven a cargar", async () => {
    blocksReply = () => Promise.reject(new Error("network"));
    const user = userEvent.setup();
    render(<InstructorPage />);
    expect(await screen.findByText(notice)).toBeInTheDocument();
    blocksReply = () => Promise.resolve([]);
    await user.click(screen.getByRole("button", { name: "Hoy" }));
    await waitFor(() => expect(screen.queryByText(notice)).not.toBeInTheDocument());
    expect(screen.getAllByText("Ana Torres")).not.toHaveLength(0);
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
      slotsOnce([{ ...slot, scheduledAt }]);
      render(<InstructorPage />);
      expect(await screen.findByRole("article")).toHaveTextContent(timeRange);
      expect(screen.getByRole("heading", { name: day })).toBeInTheDocument();
      const selected = screen.getByRole("button", { name: `${day}, 1 bloques con alumno, hoy` });
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
    slotDefault = [];
    const user = userEvent.setup();
    render(<InstructorPage />);
    await screen.findByText("No tienes bloques este día.");
    expect(slotCalls()).toContain(rangePath(from, to));
    expect(screen.getByRole("heading", { name: day })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));
    await screen.findByText("No tienes bloques este día.");
    await user.click(screen.getByRole("button", { name: "Hoy" }));
    expect(await screen.findByRole("heading", { name: day })).toBeInTheDocument();
    expect(slotCalls().at(-1)).toBe(rangePath(from, to));
  });

  it("formatea solo la primera letra en mayúscula y navega entre años", async () => {
    vi.setSystemTime(new Date("2026-10-19T15:00:00Z"));
    slotDefault = [];
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
