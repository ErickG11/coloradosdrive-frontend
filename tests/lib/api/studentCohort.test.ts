import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  assignStudentCohort,
  studentCohortAmounts,
  studentCohortError,
  studentCohortPath,
} from "@/lib/api/studentCohort";
vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
describe("contrato C", () => {
  it("usa UUID de matrícula y alumno, y solo cohortId en el cuerpo", async () => {
    expect(studentCohortPath("student-uuid", "enrollment-uuid")).toBe(
      "/admin/estudiantes/student-uuid/matriculas/enrollment-uuid",
    );
    await assignStudentCohort("student-uuid", "enrollment-uuid", "cohort-uuid");
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      "/admin/estudiantes/student-uuid/matriculas/enrollment-uuid/asignar-cohorte",
      { cohortId: "cohort-uuid" },
    );
  });
  it.each([
    "COHORT_FULL",
    "COHORT_CHANGED",
    "COHORT_WINDOW_CLOSED",
    "ABONO_EXCEEDS_NET",
    "COHORT_COURSE_MISMATCH",
    "ENROLLMENT_NOT_PENDING",
    "DELETION_PENDING",
    "ACCOUNT_INACTIVE",
    "UNCONFIRMED",
    "LOCK_CONFLICT",
  ])("mensaje específico para %s", (code) => {
    const error = studentCohortError(new ApiError("proveedor", 409, { code }));
    expect(error.message).not.toBe("proveedor");
    expect(error.refreshOptions).toBe(code === "COHORT_CHANGED");
  });
  it("desconocido/sin código conserva message; red y 503 requieren verificar", () => {
    expect(studentCohortError(new ApiError("Mensaje del backend", 400)).message).toBe(
      "Mensaje del backend",
    );
    expect(
      studentCohortError(new ApiError("Mensaje nuevo", 409, { code: "FUTURE_CODE" })).message,
    ).toBe("Mensaje nuevo");
    for (const error of [new Error("network"), new ApiError("incierto", 503)])
      expect(studentCohortError(error)).toMatchObject({
        blocked: true,
        message: expect.stringMatching(/verifica antes de repetir/),
      });
  });
  it("calcula centavos, descuento y abono exacto sin doble sumarlo", () => {
    expect(studentCohortAmounts(0.3, 0, 0.2)).toEqual({
      neto: 0.3,
      saldo: 0.1,
      abonoExcedeNeto: false,
    });
    expect(studentCohortAmounts(100, 10, 90)).toEqual({
      neto: 90,
      saldo: 0,
      abonoExcedeNeto: false,
    });
    expect(studentCohortAmounts(100, 0, 101).abonoExcedeNeto).toBe(true);
  });
});
