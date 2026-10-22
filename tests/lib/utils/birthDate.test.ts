import { describe, expect, it } from "vitest";
import {
  ageOn,
  birthDateError,
  BIRTH_DATE_CODES,
  BIRTH_DATE_MESSAGES as M,
  ENFORCE_LEGAL_MIN_AGE,
  LEGAL_MIN_AGE,
  schoolToday,
} from "@/lib/utils/birthDate";

// 2026-10-21 12:00 en Guayaquil (UTC-5).
const now = new Date("2026-10-21T17:00:00Z");

describe("fecha de nacimiento compartida", () => {
  it("usa el día de Guayaquil y no el del reloj UTC", () => {
    // 2026-10-22 02:00 UTC sigue siendo 21 de octubre en Guayaquil.
    expect(schoolToday(new Date("2026-10-22T02:00:00Z"))).toBe("2026-10-21");
    expect(birthDateError("2026-10-21", new Date("2026-10-22T02:00:00Z"))).toBe(M.edadMinima); // hoy
    expect(birthDateError("2026-10-22", new Date("2026-10-22T02:00:00Z"))).toBe(M.futura); // mañana
  });
  it("los tres mensajes son frases completas y distintos", () => {
    expect(M.futura).toBe("La fecha de nacimiento no puede ser futura.");
    expect(M.edadMinima).toBe("La edad mínima para registrar a un estudiante es de 15 años.");
    expect(M.edadMaxima).toBe("La edad máxima permitida es de 100 años.");
    expect(new Set([M.futura, M.edadMinima, M.edadMaxima]).size).toBe(3);
    expect(new Set(Object.values(BIRTH_DATE_CODES)).size).toBe(Object.values(BIRTH_DATE_CODES).length);
  });
  it("hoy cae en «menor de la edad mínima» y no en «futura»", () => {
    expect(birthDateError("2026-10-21", now)).toBe(M.edadMinima);
    expect(birthDateError("2026-10-20", now)).toBe(M.edadMinima); // ayer
  });
  it("solo una fecha posterior a hoy es «futura»", () => {
    expect(birthDateError("2026-10-22", now)).toBe(M.futura);
    expect(birthDateError("2030-01-01", now)).toBe(M.futura);
    expect(birthDateError("2999-01-01", now)).toBe(M.futura);
  });
  it("borde exacto de 15 años", () => {
    expect(birthDateError("2011-10-21", now)).toBeNull(); // cumple 15 hoy
    expect(birthDateError("2011-10-22", now)).toBe(M.edadMinima); // le falta un día
    expect(birthDateError("2010-10-21", now)).toBeNull(); // 16 años: sigue siendo válido
  });
  it("borde exacto de 100 años", () => {
    expect(birthDateError("1926-10-21", now)).toBeNull(); // cumple 100 hoy
    expect(birthDateError("1926-10-20", now)).toBeNull(); // cumplió 100 ayer
    expect(birthDateError("1925-10-22", now)).toBeNull(); // 100 años y 364 días: aún tiene 100
    expect(birthDateError("1925-10-21", now)).toBe(M.edadMaxima); // cumple 101 hoy
    expect(birthDateError("1800-01-01", now)).toBe(M.edadMaxima);
  });
  it("un año de 2011 o una fecha de este mes se aceptan como texto y devuelven un mensaje, no un bloqueo", () => {
    expect(birthDateError("2011-12-31", now)).toBe(M.edadMinima); // 14 años
    expect(birthDateError("2026-10-01", now)).toBe(M.edadMinima); // este mes
  });
  it("fechas inexistentes o con formato incorrecto no son válidas", () => {
    for (const value of ["2000-02-30", "1900-02-29", "2000-2-01", "0000-01-01", "abc"])
      expect(birthDateError(value, now)).toBe(M.invalida);
    expect(birthDateError("2000-02-29", now)).toBeNull();
  });
  it("29 de febrero: la edad se cuenta por cumpleaños completo", () => {
    const leapDay = new Date("2028-02-29T17:00:00Z");
    expect(birthDateError("2013-02-28", leapDay)).toBeNull(); // 15 cumplidos
    expect(birthDateError("2013-03-01", leapDay)).toBe(M.edadMinima);
  });
  it("calcula la edad cumplida", () => {
    expect(ageOn("2000-10-21", "2026-10-21")).toBe(26);
    expect(ageOn("2000-10-22", "2026-10-21")).toBe(25);
  });
  it("la edad legal mínima de 18 está desactivada (se reporta, no se aplica)", () => {
    expect(LEGAL_MIN_AGE).toBe(18);
    expect(ENFORCE_LEGAL_MIN_AGE).toBe(false);
    expect(birthDateError("2009-01-01", now)).toBeNull(); // 17 años: pasa mientras no se active
  });
});
