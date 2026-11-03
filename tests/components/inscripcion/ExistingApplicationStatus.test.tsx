import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExistingApplicationStatus } from "@/components/inscripcion/ExistingApplicationStatus";
import { firstIncompleteStep } from "@/components/inscripcion/flowProgress";
import type { SolicitudProgress } from "@/types/solicitud";
vi.mock("@/lib/api/solicitudes", () => ({
  solicitudes: {
    notice: vi.fn().mockResolvedValue({ contactoDerechos: "escuela@example.invalid" }),
  },
  solicitudMessage: () => "No se pudo cargar el contacto",
}));
const progress: SolicitudProgress = {
  courseId: "c",
  estado: "enviada",
  enviadaAt: "2026-11-03T15:00:00Z",
  correoVerificado: true,
  consentimientoVigente: true,
  datosGuardados: true,
  solicitadaAt: null,
  requiereRepresentante: false,
  representanteCompleto: false,
  documentos: [],
};
it("muestra envío, fecha, curso y acción para completar opcionales", () => {
  render(<ExistingApplicationStatus progress={progress} course="Tipo B" onDocuments={vi.fn()} />);
  expect(screen.getByText("Tu solicitud está pendiente de revisión")).toBeInTheDocument();
  expect(screen.getByText(/Fecha de envío/)).toBeInTheDocument();
  expect(screen.getByText("Curso: Tipo B")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Continuar subiendo documentos" })).toBeInTheDocument();
});
it("una aprobada lleva a login y no permite editar datos", () => {
  render(
    <ExistingApplicationStatus
      progress={{ ...progress, estado: "aprobada" }}
      onDocuments={vi.fn()}
    />,
  );
  expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/login");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
it("una rechazada muestra motivo y contacto de la escuela", async () => {
  render(
    <ExistingApplicationStatus
      progress={{ ...progress, estado: "rechazada", motivoRechazo: "Datos incompletos" }}
      onDocuments={vi.fn()}
    />,
  );
  expect(screen.getByText("Motivo: Datos incompletos")).toBeInTheDocument();
  expect(await screen.findByRole("link", { name: /Contactar a la escuela/ })).toHaveAttribute(
    "href",
    "mailto:escuela@example.invalid",
  );
});
it("un borrador reanuda en el primer paso incompleto", () => {
  expect(
    firstIncompleteStep({ ...progress, estado: "borrador", consentimientoVigente: false }),
  ).toBe("consentimiento");
  expect(firstIncompleteStep({ ...progress, estado: "borrador", datosGuardados: false })).toBe(
    "datos",
  );
  expect(firstIncompleteStep({ ...progress, estado: "borrador" })).toBe("documentos");
});
