import { describe, expect, it } from "vitest";
import { contentDate } from "@/lib/utils/content";
import {
  accessLabel,
  AUTO_SEND_MARGIN_MS,
  countdown,
  remainingTime,
  serverClock,
  serverTime,
  shouldAutoSend,
  timeWarning,
} from "@/lib/utils/studentContent";
import type { StudentItem } from "@/types/studentContent";

const instant = "2026-11-09T15:00:00Z";
const base = Date.parse(instant);
describe("reloj anclado al servidor", () => {
  it("compensa media latencia y avanza con tiempo monotónico", () => {
    const clock = serverClock(instant, 100, 300);
    expect(clock).toEqual({ serverMs: base + 100, receivedMs: 300 });
    expect(serverTime(clock, 1300)).toBe(base + 1100);
  });
  it("no retrocede si la muestra monotónica es anterior", () => {
    expect(serverTime(serverClock(instant, 100, 100), 0)).toBe(base);
  });
  it("no usa la hora civil del dispositivo", () => {
    const clock = serverClock(instant, 5_000, 5_000);
    expect(remainingTime("2026-11-09T15:01:00Z", clock, 35_000)).toBe(30_000);
  });
  it.each(["", "fecha inválida"])("rechaza server_now inválido: %s", (iso) => {
    expect(() => serverClock(iso, 0, 10)).toThrow();
  });
  it("rechaza muestras con latencia negativa", () => {
    expect(() => serverClock(instant, 10, 0)).toThrow();
  });
  it.each([instant, "2026-11-09T14:59:59Z", "inválido"])(
    "no da tiempo extra a un plazo vencido o inválido: %s",
    (deadline) => {
      expect(remainingTime(deadline, serverClock(instant, 0, 0), 0)).toBe(0);
    },
  );
  it("acepta el mismo instante con offset de Guayaquil", () => {
    expect(remainingTime("2026-11-09T10:01:00-05:00", serverClock(instant, 0, 0), 0)).toBe(60_000);
  });
});
describe("margen de envío único y cuenta regresiva", () => {
  it("usa diez segundos de margen", () => expect(AUTO_SEND_MARGIN_MS).toBe(10_000));
  it.each([
    [10_001, false],
    [10_000, true],
    [9_999, true],
    [1, true],
    [0, false],
    [-1, false],
  ] as const)("con %i ms autoenvía = %s", (remaining, expected) => {
    expect(shouldAutoSend(remaining)).toBe(expected);
  });
  it.each([
    [0, "0:00"],
    [-1, "0:00"],
    [1, "0:01"],
    [59_001, "1:00"],
    [60_000, "1:00"],
    [3_661_000, "61:01"],
  ] as const)("formatea %i ms como %s", (remaining, expected) => {
    expect(countdown(remaining)).toBe(expected);
  });
  it.each([
    [300_001, ""],
    [300_000, "cinco minutos"],
    [60_000, "un minuto"],
    [10_000, "Enviando"],
    [0, "terminó"],
  ] as const)("aviso estable por umbral: %i ms", (remaining, expected) => {
    expect(timeWarning(remaining)).toContain(expected);
  });
});
describe("etiquetas de acceso y fechas del alumno", () => {
  const access: StudentItem["access"] = {
    estado: "abierto",
    fuente: "cohorte",
    opens_at: instant,
    closes_at: "2026-11-09T16:00:00Z",
    max_attempts: null,
    extra_minutes: 0,
  };
  it.each([
    ["no_habilitado", "Aún no disponible"],
    ["programado", "Se abre el lun 9 nov, 10:00"],
    ["cerrado", "Cerró el lun 9 nov, 11:00"],
    ["abierto", "Cierra el lun 9 nov, 11:00"],
  ] as const)("etiqueta %s", (estado, expected) => {
    expect(accessLabel({ ...access, estado })).toBe(expected);
  });
  it("muestra acceso abierto sin cierre", () =>
    expect(accessLabel({ ...access, closes_at: null })).toBe("Disponible"));
  it("convierte cambio de día desde UTC a Guayaquil", () =>
    expect(contentDate("2026-11-10T02:30:00Z")).toBe("2026-11-09 21:30 (Guayaquil)"));
  it("mantiene la hora civil con offset explícito", () =>
    expect(contentDate("2026-11-09T09:30:00-05:00")).toBe("2026-11-09 09:30 (Guayaquil)"));
  it("no depende de la zona original", () =>
    expect(contentDate("2026-11-09T16:30:00+02:00")).toBe("2026-11-09 09:30 (Guayaquil)"));
});
