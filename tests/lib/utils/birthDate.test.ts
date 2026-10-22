import { describe, expect, it } from "vitest";
import {
  ageOn,
  birthDateBounds,
  birthDateError,
  BIRTH_DATE_MESSAGES as M,
  schoolToday,
} from "@/lib/utils/birthDate";

// 2026-10-21 12:00 en Guayaquil (UTC-5).
const now = new Date("2026-10-21T17:00:00Z");

describe("fecha de nacimiento compartida", () => {
  it("usa el día de Guayaquil y no el del reloj UTC", () => {
    // 2026-10-22 02:00 UTC sigue siendo 21 de octubre en Guayaquil.
    expect(schoolToday(new Date("2026-10-22T02:00:00Z"))).toBe("2026-10-21");
    expect(birthDateError("2026-10-21", new Date("2026-10-22T02:00:00Z"))).toBe(M.hoyOFutura);
    expect(birthDateError("2026-10-22", new Date("2026-10-22T02:00:00Z"))).toBe(M.hoyOFutura);
  });
  it("rechaza hoy y futuras, menores de 16 y mayores de 100", () => {
    expect(birthDateError("2026-10-21", now)).toBe(M.hoyOFutura);
    expect(birthDateError("2030-01-01", now)).toBe(M.hoyOFutura);
    expect(birthDateError("2010-10-22", now)).toBe(M.edad);
    expect(birthDateError("1925-10-21", now)).toBe(M.edad);
  });
  it("los límites de edad son inclusivos", () => {
    expect(birthDateError("2010-10-21", now)).toBeNull();
    expect(birthDateError("1925-10-22", now)).toBeNull();
    expect(birthDateError("1990-05-05", now)).toBeNull();
  });
  it("fechas inexistentes o con formato incorrecto no son válidas", () => {
    for (const value of ["2000-02-30", "1900-02-29", "2000-2-01", "0000-01-01", "abc"])
      expect(birthDateError(value, now)).toBe(M.invalida);
    expect(birthDateError("2000-02-29", now)).toBeNull();
  });
  it("min y max del campo coinciden exactamente con la validación", () => {
    for (const day of ["2026-10-21", "2028-02-29", "2026-03-01", "2027-01-01"]) {
      const at = new Date(`${day}T17:00:00Z`);
      const { min, max } = birthDateBounds(at);
      const today = schoolToday(at);
      expect(birthDateError(min, at)).toBeNull();
      expect(birthDateError(max, at)).toBeNull();
      expect(ageOn(max, today)).toBe(16);
      expect(ageOn(min, today)).toBe(100);
      const before = new Date(`${min}T00:00:00Z`);
      before.setUTCDate(before.getUTCDate() - 1);
      expect(birthDateError(before.toISOString().slice(0, 10), at)).toBe(M.edad);
      const after = new Date(`${max}T00:00:00Z`);
      after.setUTCDate(after.getUTCDate() + 1);
      expect(birthDateError(after.toISOString().slice(0, 10), at)).not.toBeNull();
    }
    expect(birthDateBounds(now)).toEqual({ min: "1925-10-22", max: "2010-10-21" });
  });
});
