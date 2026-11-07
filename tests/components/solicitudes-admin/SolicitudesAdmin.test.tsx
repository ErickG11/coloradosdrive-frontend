import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("@/hooks/useFetch", () => ({ useFetch: vi.fn() }));
vi.mock("@/lib/api/inscripcion", async (original) => ({
  ...(await original<typeof import("@/lib/api/inscripcion")>()),
  getResumenSolicitudes: vi.fn().mockRejectedValue(new Error("sin red")),
}));
import { useFetch } from "@/hooks/useFetch";
import { SolicitudesAdmin } from "@/components/solicitudes-admin/SolicitudesAdmin";
import type { SolicitudAdminItem } from "@/types/inscripcion";

const row: SolicitudAdminItem = {
  id: "s",
  courseId: "c",
  correo: "ana@example.com",
  nombres: "Ana",
  apellidos: "Torres",
  nombreCompleto: "Ana Torres",
  cedula: "1710034065",
  estado: "enviada",
  nivelEstudios: null,
  enviadaAt: "2026-11-03T10:00:00Z",
  devueltaAt: null,
  createdAt: "2026-10-01T10:00:00Z",
};

function respuesta(items: SolicitudAdminItem[]) {
  vi.mocked(useFetch).mockReturnValue({
    data: { items, total: items.length, page: 1, pageSize: 20 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
}

beforeEach(() => vi.clearAllMocks());

it("envía pestaña y búsqueda con paginación", async () => {
  respuesta([]);
  render(<SolicitudesAdmin />);
  const user = userEvent.setup();
  expect(useFetch).toHaveBeenLastCalledWith("/admin/solicitudes?page=1&pageSize=20&estado=enviada");
  await user.click(screen.getByRole("tab", { name: /Rechazadas/ }));
  await user.type(screen.getByLabelText("Buscar por cédula, nombre o correo"), "Ana");
  await user.click(screen.getByRole("button", { name: "Buscar" }));
  expect(useFetch).toHaveBeenLastCalledWith(
    "/admin/solicitudes?page=1&pageSize=20&estado=rechazada&q=Ana",
  );
});

it("carga Todas y conserva el orden recibido", async () => {
  respuesta([
    { ...row, id: "first", nombres: "Primera", apellidos: "Persona", nombreCompleto: "Primera Persona" },
    { ...row, id: "second", nombres: "Segunda", apellidos: "Persona", nombreCompleto: "Segunda Persona", estado: "aprobada" },
  ]);
  render(<SolicitudesAdmin />);
  await userEvent.click(screen.getByRole("tab", { name: /Todas/ }));
  expect(useFetch).toHaveBeenLastCalledWith("/admin/solicitudes?page=1&pageSize=20");
  const nombres = screen
    .getAllByText(/Persona$/)
    .map((node) => node.textContent)
    .filter((texto, i, todos) => todos.indexOf(texto) === i);
  expect(nombres).toEqual(["Primera Persona", "Segunda Persona"]);
});

// TODO(F23): pantalla de solicitudes rediseñada; reescribir contra el panel acoplado
it.skip("mantiene el panel abierto si la decisión saca la solicitud del filtro", () => {});
// TODO(F23): la revisión documental por documento se eliminó con el rediseño (verificaciones en la fuente)
it.skip("refresca el panel ante una decisión de documento hecha en otra pestaña", () => {});
