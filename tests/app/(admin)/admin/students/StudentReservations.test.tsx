import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect, vi, beforeEach } from "vitest";
import { StudentReservations } from "@/app/(admin)/admin/students/StudentReservations";
import { useFetch } from "@/hooks/useFetch";
vi.mock("@/hooks/useFetch", () => ({ useFetch: vi.fn() }));
const refetch = vi.fn();
beforeEach(() => vi.clearAllMocks());
function show(state: Record<string, unknown>) {
  vi.mocked(useFetch).mockReturnValue({
    data: null,
    error: null,
    isLoading: false,
    refetch,
    ...state,
  });
  render(<StudentReservations id="uuid" />);
}
it("consulta el endpoint por UUID y muestra motivos y estados legibles", () => {
  show({
    data: [
      {
        slot_id: "one",
        scheduled_at: "2099-01-02T15:00:00Z",
        status: "pendiente_reprogramar",
        reason: "ocupada",
      },
      {
        slot_id: "two",
        scheduled_at: "2099-01-03T15:00:00Z",
        status: "cancelada_por_desactivacion",
        reason: null,
      },
    ],
  });
  expect(useFetch).toHaveBeenCalledWith("/admin/estudiantes/uuid/reservas-pendientes");
  expect(screen.getByText("La franja está ocupada.")).toBeInTheDocument();
  expect(screen.getByText(/Cancelada por desactivación/)).toBeInTheDocument();
  expect(screen.getByText(/Se intentará recuperar/)).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
});
it.each([
  "pasada",
  "instructor_no_disponible",
  "solapamiento_alumno",
  "franja_eliminada",
  "franja_modificada",
  "matricula_no_vigente",
  "ventana_cerrada",
  "error_reserva",
  "futuro",
])("motivo %s sin exponer códigos técnicos", (reason) => {
  show({
    data: [
      {
        slot_id: "one",
        scheduled_at: "2099-01-02T15:00:00Z",
        status: "pendiente_reprogramar",
        reason,
      },
    ],
  });
  expect(screen.getByRole("listitem")).not.toHaveTextContent(reason);
});
it("carga independiente", () => {
  show({ isLoading: true });
  expect(screen.getByRole("status")).toHaveTextContent("Cargando reservas");
});
it("vacío", () => {
  show({ data: [] });
  expect(screen.getByText("No hay reservas pendientes.")).toBeInTheDocument();
});
it("error por código y reintento solo de reservas", () => {
  show({ error: "Error", errorCode: "ACCOUNT_INACTIVE", errorStatus: 403 });
  expect(screen.getByRole("alert")).toHaveTextContent("cuenta del alumno está inactiva");
  fireEvent.click(screen.getByRole("button", { name: "Reintentar reservas" }));
  expect(refetch).toHaveBeenCalledOnce();
});
