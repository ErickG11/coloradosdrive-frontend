import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnrollmentWorkspace } from "@/components/student-enrollment/EnrollmentWorkspace";
import type { StudentEnrollmentState } from "@/types/studentEnrollment";
vi.mock("@/components/student-enrollment/BillingPanel", () => ({ BillingPanel: () => null }));
vi.mock("@/components/student-enrollment/useEnrollmentOverview", () => ({
  useEnrollmentOverview: () => ({
    enrollments: {
      data: [
        {
          enrollmentId: "enrollment",
          courseId: "course",
          courseType: "A",
          status: "activo",
          cohortId: null,
          horasObjetivo: 10,
        },
      ],
      isLoading: false,
      error: null,
    },
    slots: { data: [], isLoading: false, error: null },
    courses: { data: [], error: null },
    ownSlots: [],
    identityReady: true,
    identityError: null,
    identity: null,
    now: Date.parse("2026-11-13T17:00:00Z"),
    refresh: vi.fn(),
  }),
}));
const state: StudentEnrollmentState = {
  enrollmentId: "enrollment",
  origen: "manual",
  etapa: "activa",
  accesoCompleto: true,
  pasos: { documentos: true, horario: true, pago: true },
  serverNow: "2026-11-13T17:00:00Z",
  reserva: null,
  verificaciones: {
    identidad: true,
    estudios: true,
    tipoSangreDeclarado: null,
    nivelEstudios: null,
  },
  requisitosVerificados: true,
  puedePagar: false,
  motivoBloqueo: null,
  cohorte: null,
  documentosFisicos: [],
  fechaLimite: null,
  diasRestantes: null,
  identidadPresencial: null,
};
it("Mi inscripción conserva el resumen y elimina el cambio de plan y sus acciones finales", () => {
  render(
    <EnrollmentWorkspace
      state={state}
      refreshStatus={vi.fn()}
      statusError={false}
      payment={null}
      reservation={null}
    />,
  );
  expect(screen.getByRole("heading", { name: "Mi inscripción" })).toBeInTheDocument();
  expect(screen.queryByText("Cambiar mi plan")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Consultar propuesta|Reservar propuesta/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("navigation", { name: "Acciones de tu inscripción" }),
  ).not.toBeInTheDocument();
  for (const label of ["Ir a mis horarios", "Ver mis documentos", "Contactar a la escuela"])
    expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
});
