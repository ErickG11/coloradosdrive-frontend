import { describe, expect, it } from "vitest";

import { parseSchoolDateKey, schoolDateKey } from "@/lib/utils/schoolTime";

describe("parseSchoolDateKey", () => {
  it("convierte una fecha válida en fecha civil", () => {
    const date = parseSchoolDateKey("2026-03-19");
    expect([date?.getFullYear(), date?.getMonth(), date?.getDate()]).toEqual([2026, 2, 19]);
  });

  it.each(["19-03-2026", "2026-3-9", "hola", "", "2026-03-19T10:00:00Z"])(
    "devuelve null si el formato no es AAAA-MM-DD: %j",
    (value) => {
      expect(parseSchoolDateKey(value)).toBeNull();
    },
  );

  it.each(["2026-02-31", "2026-02-30", "2026-13-01", "2026-00-10", "2026-04-31"])(
    "devuelve null si la fecha no existe: %s",
    (value) => {
      expect(parseSchoolDateKey(value)).toBeNull();
    },
  );

  it("acepta el 29 de febrero solo en año bisiesto", () => {
    expect(parseSchoolDateKey("2028-02-29")).not.toBeNull();
    expect(parseSchoolDateKey("2026-02-29")).toBeNull();
  });

  it("devuelve null para null y undefined", () => {
    expect(parseSchoolDateKey(null)).toBeNull();
    expect(parseSchoolDateKey(undefined)).toBeNull();
  });
});

describe("schoolDateKey", () => {
  it("usa el día de Guayaquil, no el de UTC", () => {
    expect(schoolDateKey("2026-10-28T03:30:00Z")).toBe("2026-10-27");
    expect(schoolDateKey("2026-10-28T05:00:00Z")).toBe("2026-10-28");
  });

  it("devuelve null si el instante no es válido", () => {
    expect(schoolDateKey("no es una fecha")).toBeNull();
  });
});
