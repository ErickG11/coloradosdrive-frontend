import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CohortsPage from "@/app/(admin)/admin/cohorts/page";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { Cohort, CohortDetail, Course } from "@/types";

vi.mock("@/hooks/useFetch", () => ({ useFetch: vi.fn() }));
vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

// Versión con microsegundos tal como la entrega PostgREST (contrato L4b).
const VERSION = "2026-10-19T15:04:05.123456+00:00";
const cohort: Cohort = {
  id: "cohort-1",
  courseId: "course-a",
  nombre: "Cohorte Marzo",
  precio: 150,
  cupoMaximo: 20,
  fechaInicioMatricula: "2026-02-01",
  fechaFinMatricula: "2026-02-25",
  fechaInicioCurso: "2026-03-01",
  fechaFinCurso: "2026-06-01",
  tipoModalidad: null,
  horariosCapacitacionTeoria: null,
  numeroVehiculos: null,
  numeroAulas: null,
  createdAt: "2026-01-15T00:00:00Z",
  updatedAt: "2026-01-15T00:00:00Z",
};
const detail: CohortDetail = {
  ...cohort,
  updatedAt: VERSION,
  alumnos: { total: 0, activos: 0, finalizados: 0, retirados: 0 },
};
const courses: Course[] = [
  {
    id: "course-a",
    nombre: "Motocicletas",
    tipo: "A",
    descripcion: null,
    createdAt: "",
    updatedAt: "",
  },
];
const refetchCohorts = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockRejectedValue(new Error("sin conteo"));
  vi.mocked(useFetch).mockImplementation(((path: string) => ({
    isLoading: false,
    error: null,
    refetch: path === "/cohorts" ? refetchCohorts : vi.fn(),
    data:
      path === "/cohorts"
        ? [cohort]
        : path === "/courses"
          ? courses
          : path === "/cohorts/cohort-1"
            ? detail
            : null,
  })) as typeof useFetch);
});

const statusText = () =>
  screen
    .getAllByRole("status")
    .map((region) => region.textContent)
    .join("");

describe("panel lateral de cohortes", () => {
  it("edita en el panel con la versión cargada por id y avisa al guardar", async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValue({});
    render(<CohortsPage />);

    await user.click(screen.getByRole("link", { name: "Editar Cohorte Marzo" }));
    const panel = within(screen.getByRole("region", { name: "Editar cohorte" }));
    expect(vi.mocked(useFetch).mock.calls.some(([path]) => path === "/cohorts/cohort-1")).toBe(
      true,
    );
    const name = panel.getByLabelText("Nombre de la cohorte");
    await user.clear(name);
    await user.type(name, "Cohorte Marzo B");
    await user.click(panel.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Editar cohorte" })).not.toBeInTheDocument(),
    );
    expect(api.patch).toHaveBeenCalledWith(
      "/cohorts/cohort-1",
      expect.objectContaining({ nombre: "Cohorte Marzo B", updatedAt: VERSION }),
    );
    expect(statusText()).toBe("Cambios guardados correctamente.");
    expect(refetchCohorts).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("abre «Nueva cohorte» en el panel y «Cancelar» lo cierra sin navegar", async () => {
    const user = userEvent.setup();
    render(<CohortsPage />);

    await user.click(screen.getByRole("link", { name: "Nueva cohorte" }));
    const panel = within(screen.getByRole("region", { name: "Nueva cohorte" }));
    expect(panel.getByRole("button", { name: "Crear cohorte" })).toBeInTheDocument();
    await user.click(panel.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("region", { name: "Nueva cohorte" })).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
