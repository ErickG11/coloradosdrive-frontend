import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CohortsPage from "@/app/(admin)/admin/cohorts/page";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Cohort, Course } from "@/types";

vi.mock("@/hooks/useFetch", () => ({
  useFetch: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({ api: { delete: vi.fn() } }));
const mockedDelete = vi.mocked(api.delete);

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

const mockedUseFetch = vi.mocked(useFetch);

const cohorts: Cohort[] = [
  {
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
  },
];

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

// Hay varias regiones vivas siempre montadas: se junta su texto.
const statusText = () =>
  screen
    .getAllByRole("status")
    .map((region) => region.textContent)
    .join("");

function mockFetchResults(options: {
  cohorts?: { data: Cohort[] | null; isLoading: boolean; error: string | null };
  courses?: { data: Course[] | null; isLoading: boolean; error: string | null };
}) {
  mockedUseFetch.mockImplementation((path: unknown) => {
    if (path === "/cohorts") {
      return {
        refetch: refetchCohorts,
        ...(options.cohorts ?? { data: [], isLoading: false, error: null }),
      };
    }
    if (path === "/courses") {
      return {
        refetch: vi.fn(),
        ...(options.courses ?? { data: [], isLoading: false, error: null }),
      };
    }
    throw new Error(`useFetch mockeado con un path inesperado: ${String(path)}`);
  });
}

describe("CohortsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
    window.history.replaceState(null, "", "/admin/cohorts");
  });

  it("muestra el estado de carga", () => {
    mockFetchResults({
      cohorts: { data: null, isLoading: true, error: null },
      courses: { data: null, isLoading: true, error: null },
    });

    render(<CohortsPage />);

    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("muestra el error si falla la carga", () => {
    mockFetchResults({
      cohorts: { data: null, isLoading: false, error: "No se pudo conectar con el servidor." },
    });

    render(<CohortsPage />);

    expect(screen.getByText("No se pudo conectar con el servidor.")).toBeInTheDocument();
  });

  it("muestra un mensaje cuando no hay cohortes", () => {
    mockFetchResults({});

    render(<CohortsPage />);

    expect(screen.getByText("Todavía no hay cohortes.")).toBeInTheDocument();
  });

  it("renderiza la cohorte con el nombre y tipo de curso unidos del lado del cliente", () => {
    mockFetchResults({
      cohorts: { data: cohorts, isLoading: false, error: null },
      courses: { data: courses, isLoading: false, error: null },
    });

    render(<CohortsPage />);

    expect(screen.getByText("Cohorte Marzo")).toBeInTheDocument();
    expect(screen.getByText("Motocicletas (Tipo A)")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
  });

  it("respeta el orden en que el servidor entrega las cohortes", () => {
    const second: Cohort = { ...cohorts[0], id: "cohort-2", nombre: "Cohorte Abril" };
    const third: Cohort = { ...cohorts[0], id: "cohort-3", nombre: "Cohorte Enero" };
    mockFetchResults({
      cohorts: { data: [second, cohorts[0], third], isLoading: false, error: null },
      courses: { data: courses, isLoading: false, error: null },
    });

    render(<CohortsPage />);

    const names = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.querySelector("td")?.textContent);
    expect(names).toEqual(["Cohorte Abril", "Cohorte Marzo", "Cohorte Enero"]);
  });

  describe("aviso tras crear o guardar", () => {
    it.each([
      ["cohorte-creada", "Cohorte creada correctamente."],
      ["cohorte-guardada", "Cambios guardados correctamente."],
    ])("con ?aviso=%s muestra «%s» y limpia la URL", (aviso, text) => {
      window.history.replaceState(null, "", `/admin/cohorts?aviso=${aviso}`);
      searchParams = new URLSearchParams(`aviso=${aviso}`);
      mockFetchResults({
        cohorts: { data: cohorts, isLoading: false, error: null },
        courses: { data: courses, isLoading: false, error: null },
      });

      render(<CohortsPage />);

      expect(statusText()).toBe(text);
      // Recargar o volver a esta entrada del historial ya no repite el aviso.
      expect(window.location.pathname).toBe("/admin/cohorts");
      expect(window.location.search).toBe("");
    });

    it("el aviso sigue visible aunque la URL ya no tenga el parámetro", () => {
      searchParams = new URLSearchParams("aviso=cohorte-creada");
      mockFetchResults({});

      const { rerender } = render(<CohortsPage />);
      searchParams = new URLSearchParams();
      rerender(<CohortsPage />);

      expect(statusText()).toBe("Cohorte creada correctamente.");
    });

    it("sin aviso (o con uno desconocido) no muestra nada ni toca la URL", () => {
      window.history.replaceState(null, "", "/admin/cohorts?aviso=otra-cosa");
      searchParams = new URLSearchParams("aviso=otra-cosa");
      mockFetchResults({});

      render(<CohortsPage />);

      expect(statusText()).toBe("");
      expect(window.location.search).toBe("?aviso=otra-cosa");
    });
  });

  describe("eliminar cohorte", () => {
    const second: Cohort = { ...cohorts[0], id: "cohort-2", nombre: "Cohorte Abril" };

    function renderList() {
      mockFetchResults({
        cohorts: { data: [cohorts[0], second], isLoading: false, error: null },
        courses: { data: courses, isLoading: false, error: null },
      });
      render(<CohortsPage />);
    }

    it("cada fila tiene la acción «Eliminar» y el modal muestra el curso", async () => {
      const user = userEvent.setup();
      renderList();

      expect(screen.getByRole("button", { name: "Eliminar Cohorte Abril" })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Eliminar Cohorte Marzo" }));

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAccessibleName("Eliminar la cohorte «Cohorte Marzo»");
      expect(dialog).toHaveTextContent("Motocicletas (Tipo A)");
    });

    it("tras eliminar, la cohorte desaparece del listado, se avisa y se recarga la lista", async () => {
      const user = userEvent.setup();
      mockedDelete.mockResolvedValue({
        id: "cohort-1",
        nombre: "Cohorte Marzo",
        message: "Cohorte eliminada.",
      });
      renderList();

      await user.click(screen.getByRole("button", { name: "Eliminar Cohorte Marzo" }));
      await user.type(
        screen.getByLabelText("Para confirmar, escribe el nombre exacto de la cohorte:"),
        "Cohorte Marzo",
      );
      await user.click(screen.getByRole("button", { name: "Eliminar cohorte" }));

      await waitFor(() => expect(statusText()).toBe("Cohorte «Cohorte Marzo» eliminada."));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByText("Cohorte Marzo")).not.toBeInTheDocument();
      expect(screen.getByText("Cohorte Abril")).toBeInTheDocument();
      expect(refetchCohorts).toHaveBeenCalledTimes(1);
    });

    it("si está bloqueada (409) no desaparece del listado", async () => {
      const user = userEvent.setup();
      const message =
        "No se puede eliminar la cohorte: tiene 1 alumno (1 activo, 0 desactivados, 0 graduados, 0 retirados), 0 franjas de práctica (0 con reserva) y 0 registros de recuperación de prácticas.";
      mockedDelete.mockRejectedValue(new ApiError(message, 409, { code: "COHORT_IN_USE" }));
      renderList();

      await user.click(screen.getByRole("button", { name: "Eliminar Cohorte Marzo" }));
      await user.type(
        screen.getByLabelText("Para confirmar, escribe el nombre exacto de la cohorte:"),
        "Cohorte Marzo",
      );
      await user.click(screen.getByRole("button", { name: "Eliminar cohorte" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      await user.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("Cohorte Marzo")).toBeInTheDocument();
      expect(refetchCohorts).not.toHaveBeenCalled();
      expect(statusText()).toBe("");
    });

    it("tras eliminar, el foco pasa al mensaje de éxito y no queda en body", async () => {
      const user = userEvent.setup();
      mockedDelete.mockResolvedValue({
        id: "cohort-1",
        nombre: "Cohorte Marzo",
        message: "Cohorte eliminada.",
      });
      renderList();

      await user.click(screen.getByRole("button", { name: "Eliminar Cohorte Marzo" }));
      await user.type(
        screen.getByLabelText("Para confirmar, escribe el nombre exacto de la cohorte:"),
        "Cohorte Marzo",
      );
      await user.click(screen.getByRole("button", { name: "Eliminar cohorte" }));

      await waitFor(() => expect(statusText()).toContain("eliminada."));
      const region = screen
        .getAllByRole("status")
        .find((r) => r.textContent?.includes("eliminada."));
      expect(region).toHaveFocus();
    });

    it("el aviso de creación se oculta al abrir una eliminación y al completarla", async () => {
      const user = userEvent.setup();
      searchParams = new URLSearchParams("aviso=cohorte-creada");
      mockedDelete.mockResolvedValue({
        id: "cohort-1",
        nombre: "Cohorte Marzo",
        message: "Cohorte eliminada.",
      });
      renderList();
      expect(statusText()).toBe("Cohorte creada correctamente.");

      await user.click(screen.getByRole("button", { name: "Eliminar Cohorte Marzo" }));
      expect(statusText()).toBe("");

      await user.type(
        screen.getByLabelText("Para confirmar, escribe el nombre exacto de la cohorte:"),
        "Cohorte Marzo",
      );
      await user.click(screen.getByRole("button", { name: "Eliminar cohorte" }));

      await waitFor(() => expect(statusText()).toBe("Cohorte «Cohorte Marzo» eliminada."));
    });

    it("un refetch con datos ya cargados no reemplaza la tabla por «Cargando…»", () => {
      mockFetchResults({
        cohorts: { data: cohorts, isLoading: true, error: null },
        courses: { data: courses, isLoading: true, error: null },
      });

      render(<CohortsPage />);

      expect(screen.queryByText("Cargando…")).not.toBeInTheDocument();
      expect(screen.getByText("Cohorte Marzo")).toBeInTheDocument();
    });
  });
});
