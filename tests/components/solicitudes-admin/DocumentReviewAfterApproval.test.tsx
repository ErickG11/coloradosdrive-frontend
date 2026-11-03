import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SolicitudDetail } from "@/components/solicitudes-admin/SolicitudDetail";
import type { SolicitudAdmin } from "@/types/solicitud";
vi.mock("@/hooks/useFetch", () => ({ useFetch: () => ({ data: [] }) }));
it("una aprobada mantiene revisión de documentos recibidos y bloquea la decisión de solicitud", () => {
  const row: SolicitudAdmin = {
    id: "s",
    courseId: "c",
    cedula: "1710034065",
    nombreCompleto: "Ana Torres",
    correo: "ana@example.com",
    telefono: null,
    fechaNacimiento: "1990-01-01",
    estado: "aprobada",
    enviadaAt: "2026-11-03",
    motivoRechazo: null,
    createdAt: "2026-10-01",
    solicitadaAt: "2026-10-01",
    consentimiento: null,
    documentos: [
      { tipoDocumento: "cedula", estado: "recibido", documentoId: "d", motivoRechazo: null },
    ],
  };
  render(<SolicitudDetail solicitud={row} onClose={vi.fn()} onDone={vi.fn()} />);
  expect(screen.getByText("Fecha de envío")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Aprobar documento" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Aprobar solicitud" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Eliminar solicitud" })).not.toBeInTheDocument();
});
