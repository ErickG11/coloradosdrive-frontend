import { describe, expect, it } from "vitest";

import { maxCohortDate } from "@/app/(admin)/admin/cohorts/cohortLimits";

describe("maxCohortDate", () => {
  it("devuelve hoy + 5 años en formato YYYY-MM-DD", () => {
    expect(maxCohortDate(new Date("2026-10-20T15:00:00Z"))).toBe("2031-10-20");
  });

  it("usa el día de la escuela (America/Guayaquil), no el UTC", () => {
    // 03:00 UTC del 21 todavía es 20 de octubre en Guayaquil (UTC-5).
    expect(maxCohortDate(new Date("2026-10-21T03:00:00Z"))).toBe("2031-10-20");
  });

  it("un 29 de febrero pasa al 28 si el año destino no es bisiesto", () => {
    expect(maxCohortDate(new Date("2028-02-29T15:00:00Z"))).toBe("2033-02-28");
  });
});
