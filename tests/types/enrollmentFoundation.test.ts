import { describe, expect, it } from "vitest";
import type { IndividualEnrollmentSnapshot } from "../../types/enrollmentFoundation";
import type { StudentScheduleReservation } from "../../types/studentSchedule";

describe("contratos aditivos del lote 1", () => {
  it("acepta la reserva legacy sin exigir campos que el backend aún no publica", () => {
    const reservation: StudentScheduleReservation = {
      id: "fixture-reservation",
      enrollmentId: "fixture-enrollment",
      estado: "vigente",
      expiraAt: "2030-01-01T12:15:00Z",
      serverNow: "2030-01-01T12:00:00Z",
      extensiones: 0,
      puedeAmpliar: true,
      cohorte: { id: "fixture-cohort", nombre: "Fixture" },
      franjas: [],
    };
    expect(reservation.individualDates).toBeUndefined();
  });
  it("representa históricos incompletos sin inventar fechas, importes ni habilitar acceso", () => {
    const snapshot: IndividualEnrollmentSnapshot = {
      practiceStartDate: null,
      practiceEndDate: null,
      accessEndDate: null,
      paidAmountCentavos: null,
      datesSource: null,
      guardReady: false,
    };
    expect(snapshot.guardReady).toBe(false);
    expect(snapshot).not.toHaveProperty("cohorte");
  });
});
