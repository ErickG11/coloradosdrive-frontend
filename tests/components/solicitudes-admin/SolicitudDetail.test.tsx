import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("@/lib/api/inscripcion", async (original) => ({
  ...(await original<typeof import("@/lib/api/inscripcion")>()),
  getSolicitudAdmin: vi.fn(),
}));
vi.mock("@/hooks/useFetch", () => ({
  useFetch: () => ({ data: { active: false }, refetch: vi.fn(), isLoading: false }),
}));
import { getSolicitudAdmin } from "@/lib/api/inscripcion";
import { SolicitudDetail } from "@/components/solicitudes-admin/SolicitudDetail";
import type { SolicitudAdminDetalle, SolicitudAdminItem } from "@/types/inscripcion";

const item: SolicitudAdminItem = {
  id: "s",
  courseId: "c",
  correo: "ana@example.com",
  nombres: "Ana",
  apellidos: "Torres",
  nombreCompleto: "Ana Torres",
  cedula: "1710034065",
  estado: "aprobada",
  nivelEstudios: null,
  enviadaAt: "2026-11-03T10:00:00Z",
  devueltaAt: null,
  createdAt: "2026-10-01T10:00:00Z",
};

const detalle: SolicitudAdminDetalle = {
  ...item,
  telefono: null,
  fechaNacimiento: "1990-01-01",
  nacionalidadTipo: null,
  tipoSangre: null,
  curso: null,
  documentoRequerido: false,
  documentoEstudiosPendientePorCupo: false,
  certificado: null,
  consentimiento: {
    versionAviso: "2026-10-v1",
    versionTerminos: "2026-11-borrador-v1",
    aceptadoAt: "2026-10-01T10:00:00Z",
    representanteNombre: "Representante",
    representanteCedula: "1710034065",
    representanteAcepta: true,
  },
  verificaciones: [],
  devolucionMotivoCodigo: null,
  devolucionMensaje: null,
  devolucionNotaInterna: null,
  rechazoMotivoCodigo: null,
  rechazoNotaInterna: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom no implementa scrollIntoView, que el panel usa al abrirse.
  Element.prototype.scrollIntoView = vi.fn();
  vi.mocked(getSolicitudAdmin).mockResolvedValue(detalle);
});

it("muestra el encabezado y las tres secciones del panel", async () => {
  render(<SolicitudDetail item={item} onClose={vi.fn()} onChanged={vi.fn()} />);
  expect(screen.getByRole("dialog", { name: "Ana Torres" })).toBeInTheDocument();
  expect(await screen.findByRole("tab", { name: "Lo que declaró" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Verificaciones" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Consentimiento" })).toBeInTheDocument();
});

it("cambia de sección con las flechas del teclado", async () => {
  const user = userEvent.setup();
  render(<SolicitudDetail item={item} onClose={vi.fn()} onChanged={vi.fn()} />);
  const primera = await screen.findByRole("tab", { name: "Lo que declaró" });
  primera.focus();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("tab", { name: "Verificaciones" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

it("cierra con Escape y con el botón de cerrar", async () => {
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<SolicitudDetail item={item} onClose={onClose} onChanged={vi.fn()} />);
  await screen.findByRole("tab", { name: "Verificaciones" });
  await user.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Cerrar panel" }));
  expect(onClose).toHaveBeenCalledTimes(2);
});

it("solicitud pendiente coloca eliminar en Más y las tres decisiones en el pie", async () => {
  vi.mocked(getSolicitudAdmin).mockResolvedValue({ ...detalle, estado: "enviada" });
  render(
    <SolicitudDetail item={{ ...item, estado: "enviada" }} onClose={vi.fn()} onChanged={vi.fn()} />,
  );
  await screen.findByRole("tab", { name: "Lo que declaró" });
  const dialog = screen.getByRole("dialog", { name: "Ana Torres" });
  const footer = within(dialog.querySelector("footer")!);
  expect(footer.getByRole("button", { name: "Rechazar" })).toBeEnabled();
  expect(footer.getByRole("button", { name: "Devolver para corregir" })).toBeEnabled();
  expect(footer.getByRole("button", { name: "Aprobar" })).toBeDisabled();
  expect(footer.getByRole("status")).toHaveTextContent("Para aprobar falta:");
  expect(footer.queryByRole("button", { name: "Eliminar solicitud" })).not.toBeInTheDocument();
  const user = userEvent.setup();
  await user.click(screen.getByLabelText("Más acciones de la solicitud"));
  expect(screen.getByRole("button", { name: "Eliminar solicitud" })).toBeInTheDocument();
});
it("la aprobación conserva sus requisitos al completarse identidad y estudios", async () => {
  vi.mocked(getSolicitudAdmin).mockResolvedValue({
    ...detalle,
    estado: "enviada",
    verificaciones: [
      {
        id: "identity",
        tipo: "identidad",
        resultado: "verificado",
        createdAt: "2026-11-13T12:00:00Z",
      },
      {
        id: "studies",
        tipo: "estudios",
        resultado: "verificado",
        createdAt: "2026-11-13T12:00:00Z",
      },
    ] as SolicitudAdminDetalle["verificaciones"],
  });
  render(
    <SolicitudDetail item={{ ...item, estado: "enviada" }} onClose={vi.fn()} onChanged={vi.fn()} />,
  );
  expect(await screen.findByRole("button", { name: "Aprobar" })).toBeEnabled();
});
