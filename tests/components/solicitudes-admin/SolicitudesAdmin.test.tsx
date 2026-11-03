import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("@/hooks/useFetch", () => ({ useFetch: vi.fn() }));
import { useFetch } from "@/hooks/useFetch";
import { SolicitudesAdmin } from "@/components/solicitudes-admin/SolicitudesAdmin";
vi.mock("@/lib/api/solicitudes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/solicitudes")>()),
  solicitudes: { list: vi.fn(), reviewDocument: vi.fn(), decide: vi.fn() },
}));
import { solicitudes } from "@/lib/api/solicitudes";
import { ApiError } from "@/lib/api/errors";
import type { SolicitudAdmin } from "@/types/solicitud";
const row: SolicitudAdmin = {
  id: "s",
  courseId: "c",
  cedula: "1710034065",
  nombreCompleto: "Ana",
  correo: "ana@example.com",
  telefono: null,
  fechaNacimiento: "1990-01-01",
  estado: "pendiente_revision",
  motivoRechazo: null,
  createdAt: "2026-10-01",
  solicitadaAt: "2026-10-01",
  consentimiento: null,
  documentos: [
    { tipoDocumento: "cedula", estado: "recibido", documentoId: "d", motivoRechazo: null },
  ],
};
beforeEach(() => vi.clearAllMocks());
it("envía filtro y búsqueda con paginación", async () => {
  vi.mocked(useFetch).mockReturnValue({
    data: { items: [], total: 0, page: 1, pageSize: 20 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  render(<SolicitudesAdmin />);
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText("Estado"), "rechazada");
  await user.type(screen.getByLabelText("Buscar por cédula, nombre o correo"), "Ana");
  await user.click(screen.getByRole("button", { name: "Buscar" }));
  expect(useFetch).toHaveBeenLastCalledWith(
    "/admin/solicitudes?page=1&pageSize=20&estado=rechazada&q=Ana",
  );
});
it("mantiene el drawer abierto si la decisión saca la solicitud del filtro", async () => {
  const refetch = vi.fn();
  vi.mocked(useFetch).mockReturnValue({
    data: { items: [row], total: 1, page: 1, pageSize: 20 },
    isLoading: false,
    error: null,
    refetch,
  });
  vi.mocked(solicitudes.decide).mockResolvedValue({
    id: "s",
    estado: "aprobada",
    studentId: "u",
    correoEnviado: false,
    cohorteAsignada: { cohortId: null, estado: "pendiente_cohorte" },
  });
  const view = render(<SolicitudesAdmin />),
    user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Revisar solicitud" }));
  expect(screen.getByRole("button", { name: "Revisar solicitud" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await user.click(screen.getByRole("button", { name: "Aprobar solicitud" }));
  await user.click(screen.getByRole("button", { name: "Confirmar aprobación" }));
  vi.mocked(useFetch).mockReturnValue({
    data: { items: [], total: 0, page: 1, pageSize: 20 },
    isLoading: false,
    error: null,
    refetch,
  });
  view.rerender(<SolicitudesAdmin />);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText(/La decisión se guardó, pero el correo/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Aprobar solicitud" })).not.toBeInTheDocument();
});
it("refresca el panel ante una decisión de documento hecha en otra pestaña", async () => {
  const refetch = vi.fn();
  vi.mocked(useFetch).mockReturnValue({
    data: { items: [row], total: 1, page: 1, pageSize: 20 },
    isLoading: false,
    error: null,
    refetch,
  });
  vi.mocked(solicitudes.reviewDocument).mockRejectedValue(
    new ApiError("Conflicto", 409, { code: "DOCUMENTO_YA_REVISADO" }),
  );
  vi.mocked(solicitudes.list).mockResolvedValue({
    items: [{ ...row, documentos: [{ ...row.documentos[0], estado: "aprobado" }] }],
    total: 1,
    page: 1,
    pageSize: 100,
  });
  render(<SolicitudesAdmin />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Revisar solicitud" }));
  await user.click(screen.getByRole("button", { name: "Aprobar documento" }));
  await user.click(screen.getByRole("button", { name: "Confirmar aprobación" }));
  expect(await screen.findByText("Aprobado")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Rechazar documento" })).not.toBeInTheDocument();
  expect(solicitudes.list).toHaveBeenCalledOnce();
  expect(screen.getByRole("alert")).toHaveTextContent("Este documento ya fue revisado");
});

it("carga Todas y conserva el orden recibido, mostrando documentos por revisar", async () => {
  vi.mocked(useFetch).mockReturnValue({
    data: {
      items: [
        {
          ...row,
          id: "first",
          nombreCompleto: "Primera Persona",
          documentosPorRevisar: 2,
          enviadaAt: "2026-11-03",
        },
        { ...row, id: "second", nombreCompleto: "Segunda Persona", estado: "aprobada" },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  render(<SolicitudesAdmin />);
  expect(screen.getByLabelText("Estado")).toHaveValue("");
  expect(screen.getAllByRole("rowheader").map((node) => node.textContent)).toEqual([
    "Primera Persona",
    "Segunda Persona",
  ]);
  expect(screen.getByText("Documentos por revisar (2)")).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText("Estado"), "con_documentos_por_revisar");
  expect(useFetch).toHaveBeenLastCalledWith(
    "/admin/solicitudes?page=1&pageSize=20&estado=con_documentos_por_revisar",
  );
});
