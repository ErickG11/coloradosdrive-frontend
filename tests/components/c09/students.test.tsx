import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { StudentCohortAssignment } from "@/app/(admin)/admin/students/StudentCohortAssignment";
import { StudentCohortTransfer } from "@/app/(admin)/admin/students/StudentCohortTransfer";
import { pendingEnrollment, cohortOptions } from "@/tests/fixtures/studentCohort";
import { api } from "@/lib/api/client";
const { management, refetch } = vi.hoisted(() => ({
  refetch: vi.fn(),
  management: {
    version: "2026-11-12T12:00:00.123456Z",
    transferEnabled: true,
    destinations: [
      {
        id: "open",
        name: "Abierta con cupo",
        from: "2026-11-20",
        to: "2026-12-31",
        capacity: 20,
        occupied: 5,
        fits: true,
        reason: "El plan cabe.",
        open: true,
        enabled: true,
        current: false,
      },
      {
        id: "closed",
        name: "Cerrada",
        open: false,
        enabled: true,
        current: false,
        capacity: 20,
        occupied: 0,
      },
      {
        id: "full",
        name: "Completa",
        open: true,
        enabled: true,
        current: false,
        capacity: 20,
        occupied: 20,
      },
      {
        id: "current",
        name: "Actual",
        open: true,
        enabled: true,
        current: true,
        capacity: 20,
        occupied: 0,
      },
    ],
  },
}));
vi.mock("@/hooks/useFetch", () => ({
  useFetch: (path: string) => ({
    data: path.endsWith("/gestion") ? management : cohortOptions,
    isLoading: false,
    error: null,
    refetch,
  }),
}));
vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.post).mockResolvedValue({});
});
it("asignación abre el panel lateral, exige selección y motivo y muestra la comprobación", async () => {
  const user = userEvent.setup(),
    onSaved = vi.fn();
  render(
    <StudentCohortAssignment
      studentId="student"
      enrollment={pendingEnrollment}
      onClose={vi.fn()}
      onSaved={onSaved}
      onReload={vi.fn()}
      onDeletionPending={vi.fn()}
    />,
  );
  expect(screen.getByRole("complementary", { name: "Asignar cohorte" })).toBeInTheDocument();
  const submit = screen.getByRole("button", { name: "Confirmar asignación" });
  expect(submit).toBeDisabled();
  await user.selectOptions(screen.getByLabelText("Cohorte"), cohortOptions.items[0].id);
  expect(submit).toBeDisabled();
  await user.type(screen.getByLabelText("Motivo de la asignación"), "Asignación solicitada");
  expect(screen.getByText("Cupos disponibles: 1")).toBeInTheDocument();
  await user.click(submit);
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(api.post).toHaveBeenCalledWith(expect.stringContaining("/asignar-cohorte"), {
    cohortId: cohortOptions.items[0].id,
    motivo: "Asignación solicitada",
  });
});
it("cambio lista solo destinos abiertos con cupo y conserva la versión exacta", async () => {
  const user = userEvent.setup(),
    onChanged = vi.fn();
  render(
    <StudentCohortTransfer
      studentId="student"
      enrollment={{
        ...pendingEnrollment,
        status: "activo",
        cohorte: {
          id: "current",
          nombre: "Actual",
          fecha_inicio_curso: "2026-11-20",
          fecha_fin_curso: "2026-12-31",
        },
      }}
      onClose={vi.fn()}
      onChanged={onChanged}
    />,
  );
  expect(screen.getByRole("complementary", { name: "Cambiar de cohorte" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: /Cerrada|Completa|Actual/ })).not.toBeInTheDocument();
  expect(screen.getByRole("option", { name: /15 cupos libres/ })).toBeInTheDocument();
  const submit = screen.getByRole("button", { name: "Confirmar cambio de cohorte" });
  expect(submit).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Cohorte destino"), { target: { value: "open" } });
  expect(screen.getByLabelText("Comprobación del plan")).toHaveTextContent("El plan cabe.");
  await user.type(screen.getByLabelText("Motivo del cambio de cohorte"), "Cambio autorizado");
  await user.click(submit);
  await waitFor(() => expect(onChanged).toHaveBeenCalled());
  expect(api.post).toHaveBeenCalledWith(expect.stringContaining("/cohorte"), {
    cohortId: "open",
    version: management.version,
    motivo: "Cambio autorizado",
    excepcion: false,
  });
});
