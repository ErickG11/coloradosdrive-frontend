import { expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
vi.mock("@/hooks/useFetch", () => ({ useFetch: () => ({ data: [] }) }));
import { SolicitudDetail } from "@/components/solicitudes-admin/SolicitudDetail";
import type { SolicitudAdmin } from "@/types/solicitud";
export const solicitud: SolicitudAdmin = {
  id: "s",
  courseId: "c",
  cedula: "1710034065",
  nombreCompleto: "Ana",
  correo: "ana@example.com",
  telefono: null,
  fechaNacimiento: "2010-01-01",
  estado: "pendiente_revision",
  motivoRechazo: null,
  createdAt: "2026-10-01",
  solicitadaAt: "2026-10-01",
  consentimiento: {
    version: "2026-10-v1",
    aceptadoAt: "2026-10-01",
    representanteNombre: "Representante",
    representanteCedula: "1710034065",
    representanteAcepta: true,
  },
  documentos: [],
};
it("muestra datos, consentimiento, representante y checklist en el modal", () => {
  render(<SolicitudDetail solicitud={solicitud} onClose={vi.fn()} onDone={vi.fn()} />);
  expect(screen.getByRole("dialog")).toHaveAccessibleName("Solicitud de Ana");
  expect(screen.getByText("Versión: 2026-10-v1")).toBeInTheDocument();
  expect(screen.getByText("Representante: Representante")).toBeInTheDocument();
  expect(screen.getAllByText("Faltante")).toHaveLength(4);
});
it.each(["faltante", "recibido", "aprobado", "rechazado"])(
  "acciones de documento en estado %s",
  (estado) => {
    render(
      <SolicitudDetail
        solicitud={{
          ...solicitud,
          documentos: [
            {
              tipoDocumento: "cedula",
              estado,
              documentoId: estado === "faltante" ? null : "d",
              motivoRechazo: estado === "rechazado" ? "Foto borrosa" : null,
            },
          ],
        }}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    const card = screen.getByRole("heading", { name: "Cédula" }).parentElement!;
    expect(within(card).queryByRole("button", { name: "Ver" }) !== null).toBe(
      estado !== "faltante",
    );
    expect(within(card).queryByRole("button", { name: "Aprobar documento" }) !== null).toBe(
      estado === "recibido",
    );
    expect(within(card).queryByRole("button", { name: "Rechazar documento" }) !== null).toBe(
      estado === "recibido",
    );
    if (estado === "rechazado")
      expect(within(card).getByText("Motivo: Foto borrosa")).toBeInTheDocument();
  },
);
it.each(["aprobada", "rechazada"])(
  "solicitud %s deja documentos y decisiones en solo lectura",
  (estado) => {
    render(
      <SolicitudDetail
        solicitud={{
          ...solicitud,
          estado,
          documentos: [
            { tipoDocumento: "cedula", estado: "recibido", documentoId: "d", motivoRechazo: null },
          ],
        }}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Ver" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^(Aprobar|Rechazar)/ })).not.toBeInTheDocument();
    expect(Boolean(screen.queryByRole("button", { name: "Eliminar solicitud" }))).toBe(
      estado === "rechazada",
    );
  },
);
