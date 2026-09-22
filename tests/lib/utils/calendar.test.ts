import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  addWeeks,
  dayKey,
  formatMonthLabel,
  formatWeekRangeLabel,
  getMonthGrid,
  getWeekDays,
  groupByDay,
  isInMonth,
  isSameDay,
  startOfWeek,
} from "@/lib/utils/calendar";

describe("isSameDay", () => {
  it("es true para la misma fecha con distinta hora", () => {
    expect(isSameDay(new Date(2026, 0, 15, 8, 0), new Date(2026, 0, 15, 23, 30))).toBe(true);
  });

  it("es false para días distintos", () => {
    expect(isSameDay(new Date(2026, 0, 15), new Date(2026, 0, 16))).toBe(false);
  });
});

describe("addDays / addWeeks / addMonths", () => {
  it("addDays suma días y trunca la hora a medianoche local", () => {
    const result = addDays(new Date(2026, 0, 30, 14, 0), 3);
    expect(result).toEqual(new Date(2026, 1, 2));
  });

  it("addWeeks suma múltiplos de 7 días", () => {
    const result = addWeeks(new Date(2026, 0, 1), 2);
    expect(result).toEqual(new Date(2026, 0, 15));
  });

  it("addMonths cambia de mes preservando el día 1", () => {
    expect(addMonths(new Date(2026, 0, 15), 1)).toEqual(new Date(2026, 1, 1));
  });
});

describe("startOfWeek / getWeekDays", () => {
  it("startOfWeek devuelve el lunes de esa semana, incluso si la fecha es domingo", () => {
    // 2026-01-18 es domingo.
    const monday = startOfWeek(new Date(2026, 0, 18));
    expect(monday).toEqual(new Date(2026, 0, 12));
  });

  it("getWeekDays devuelve 7 días consecutivos empezando en lunes", () => {
    const days = getWeekDays(new Date(2026, 0, 14));
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1);
    expect(days[6].getDay()).toBe(0);
    days.forEach((day, index) => {
      if (index > 0) {
        expect(day.getTime() - days[index - 1].getTime()).toBe(24 * 60 * 60 * 1000);
      }
    });
  });
});

describe("getMonthGrid", () => {
  it("cubre semanas completas (múltiplos de 7) que empiezan en lunes y terminan en domingo", () => {
    const weeks = getMonthGrid(new Date(2026, 1, 10)); // febrero 2026

    weeks.forEach((week) => {
      expect(week).toHaveLength(7);
      expect(week[0].getDay()).toBe(1);
      expect(week[6].getDay()).toBe(0);
    });
  });

  it("incluye todos los días del mes exactamente una vez", () => {
    const month = new Date(2026, 1, 1); // febrero 2026 (28 días)
    const weeks = getMonthGrid(month);
    const daysInMonth = weeks.flat().filter((day) => isInMonth(day, month));

    expect(daysInMonth).toHaveLength(28);
    const dates = daysInMonth.map((day) => day.getDate());
    expect(new Set(dates).size).toBe(28);
  });

  it("incluye días del mes anterior/siguiente solo para completar la semana", () => {
    const month = new Date(2026, 1, 1); // 1 de febrero de 2026 es domingo
    const weeks = getMonthGrid(month);
    const leadingDays = weeks[0].filter((day) => !isInMonth(day, month));

    // La semana que contiene el 1 de febrero (domingo) empieza el lunes
    // 26 de enero: 6 días de enero antes del propio 1 de febrero.
    expect(leadingDays).toHaveLength(6);
    leadingDays.forEach((day) => expect(day.getMonth()).toBe(0));
  });
});

describe("dayKey", () => {
  it("formatea como yyyy-MM-dd con ceros a la izquierda", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("groupByDay", () => {
  it("agrupa por día local y ordena cada grupo cronológicamente", () => {
    const items = [
      { id: "b", scheduledAt: "2026-01-05T15:00:00" },
      { id: "a", scheduledAt: "2026-01-05T09:00:00" },
      { id: "c", scheduledAt: "2026-01-06T09:00:00" },
    ];

    const groups = groupByDay(items, (item) => item.scheduledAt);

    expect([...groups.keys()]).toEqual(["2026-01-05", "2026-01-06"]);
    expect(groups.get("2026-01-05")?.map((item) => item.id)).toEqual(["a", "b"]);
    expect(groups.get("2026-01-06")?.map((item) => item.id)).toEqual(["c"]);
  });
});

describe("formatMonthLabel", () => {
  it('capitaliza el mes: "Septiembre 2026"', () => {
    expect(formatMonthLabel(new Date(2026, 8, 1))).toBe("Septiembre 2026");
  });
});

describe("formatWeekRangeLabel", () => {
  it("misma semana dentro de un solo mes: solo un día y mes al final", () => {
    // 2026-09-15 es martes -> semana lunes 14 a domingo 20 de septiembre.
    expect(formatWeekRangeLabel(new Date(2026, 8, 15))).toBe("14 - 20 de septiembre, 2026");
  });

  it("semana que cruza de mes (mismo año)", () => {
    // 2026-09-28 es lunes -> semana lunes 28 sept a domingo 4 de octubre.
    expect(formatWeekRangeLabel(new Date(2026, 8, 28))).toBe(
      "28 de septiembre - 4 de octubre, 2026",
    );
  });

  it("semana que cruza de año", () => {
    // 2025-12-29 es lunes -> semana lunes 29 dic 2025 a domingo 4 ene 2026.
    expect(formatWeekRangeLabel(new Date(2025, 11, 29))).toBe(
      "29 de diciembre de 2025 - 4 de enero de 2026",
    );
  });
});
