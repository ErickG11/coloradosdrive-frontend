import { describe, expect, it } from "vitest";
import { parseCents, summarizePayment } from "@/app/(admin)/admin/enrollments/wizard/payment";
import type { CourseSelection } from "@/app/(admin)/admin/enrollments/wizard/wizardTypes";

const course: CourseSelection = {
  courseId: "course",
  courseTipo: "A",
  courseNombre: "A",
  cohortId: "cohort",
  manualOverride: false,
  cohort: {
    id: "cohort",
    course_id: "course",
    nombre: "C",
    precio: "0.30",
    cupo_maximo: 1,
    ocupados: 0,
    fecha_inicio_matricula: "",
    fecha_fin_matricula: "",
    fecha_inicio_curso: "",
    fecha_fin_curso: "",
  },
};

describe("importes de matrícula en centavos", () => {
  it("convierte cadenas decimales sin cálculo binario y rechaza precisión excesiva", () => {
    expect(parseCents("0.30")).toBe(30);
    expect(parseCents("0.001")).toBeNull();
    expect(parseCents("90071992547409.92")).toBeNull();
    expect(
      summarizePayment(course, { modalidad: "abono", descuento: "0.10", montoAbonado: "0.10" }),
    ).toMatchObject({
      grossCents: 30,
      discountCents: 10,
      netCents: 20,
      paidCents: 10,
      balanceCents: 10,
      error: null,
    });
  });
  it("pendiente de cohorte admite abono sin tope y saldo desconocido", () => {
    expect(
      summarizePayment(
        { ...course, cohortId: null, cohort: undefined },
        { modalidad: "abono", descuento: "0", montoAbonado: "1000.01" },
      ),
    ).toMatchObject({ paidCents: 100001, balanceCents: null, error: null });
  });
  it("abono igual al neto requiere pago completo", () => {
    expect(
      summarizePayment(course, { modalidad: "abono", descuento: "0.10", montoAbonado: "0.20" })
        .error,
    ).toMatch(/pago completo/);
  });
});
