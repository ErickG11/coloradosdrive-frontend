import { describe, expect, it } from "vitest";

import { BIRTH_DATE_MESSAGES, ageOn, birthDateError, schoolToday } from "@/lib/utils/birthDate";

// «Hoy» fijo: 15/06/2026 12:00 en Guayaquil (UTC-5).
const NOW = new Date("2026-06-15T17:00:00Z");

describe("schoolToday", () => {
  it("usa el día de Guayaquil, no el de UTC", () => {
    // 02:00 UTC del 16 sigue siendo el 15 a las 21:00 en Guayaquil.
    expect(schoolToday(new Date("2026-06-16T02:00:00Z"))).toBe("2026-06-15");
    expect(schoolToday(new Date("2026-06-16T05:00:00Z"))).toBe("2026-06-16");
  });
});

describe("ageOn", () => {
  it("cuenta años cumplidos y respeta el cumpleaños exacto", () => {
    expect(ageOn("2011-06-15", "2026-06-15")).toBe(15);
    expect(ageOn("2011-06-16", "2026-06-15")).toBe(14);
  });
  it("trata el 29 de febrero: cumple el 1 de marzo en años no bisiestos", () => {
    expect(ageOn("2012-02-29", "2027-02-28")).toBe(14);
    expect(ageOn("2012-02-29", "2027-03-01")).toBe(15);
    expect(ageOn("2012-02-29", "2028-02-29")).toBe(16);
  });
});

describe("birthDateError", () => {
  it("acepta exactamente 15 años cumplidos hoy", () => {
    expect(birthDateError("2011-06-15", NOW)).toBeNull();
  });
  it("rechaza al que cumple 15 mañana", () => {
    expect(birthDateError("2011-06-16", NOW)).toBe(BIRTH_DATE_MESSAGES.edadMinima);
  });
  it("hoy tiene 0 años: cae en edad mínima, no en «futura»", () => {
    expect(birthDateError("2026-06-15", NOW)).toBe(BIRTH_DATE_MESSAGES.edadMinima);
  });
  it("una fecha posterior a hoy es futura", () => {
    expect(birthDateError("2026-06-16", NOW)).toBe(BIRTH_DATE_MESSAGES.futura);
  });
  it("acepta 100 años cumplidos y rechaza 101", () => {
    expect(birthDateError("1926-06-15", NOW)).toBeNull();
    expect(birthDateError("1925-06-15", NOW)).toBe(BIRTH_DATE_MESSAGES.edadMaxima);
  });
  it("rechaza fechas que no existen o con formato inválido", () => {
    for (const value of ["2011-02-30", "2011-13-01", "15/06/2011", "", "abc"])
      expect(birthDateError(value, NOW)).toBe(BIRTH_DATE_MESSAGES.invalida);
  });
  it("acepta el 29 de febrero real y rechaza el de un año no bisiesto", () => {
    expect(birthDateError("2008-02-29", NOW)).toBeNull();
    expect(birthDateError("2009-02-29", NOW)).toBe(BIRTH_DATE_MESSAGES.invalida);
  });
  it("usa el día de Guayaquil: a las 21:00 del 15 en Guayaquil todavía es 15", () => {
    expect(birthDateError("2011-06-15", new Date("2026-06-16T02:00:00Z"))).toBeNull();
    expect(birthDateError("2011-06-16", new Date("2026-06-16T02:00:00Z"))).toBe(
      BIRTH_DATE_MESSAGES.edadMinima,
    );
  });
});
