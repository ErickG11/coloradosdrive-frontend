import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CohortsPage from "@/app/(admin)/admin/cohorts/page";
import { useFetch } from "@/hooks/useFetch";
import type { Cohort, Course } from "@/types";

vi.mock("@/hooks/useFetch", () => ({
  useFetch: vi.fn(),
}));

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

function mockFetchResults(options: {
  cohorts?: { data: Cohort[] | null; isLoading: boolean; error: string | null };
  courses?: { data: Course[] | null; isLoading: boolean; error: string | null };
}) {
  mockedUseFetch.mockImplementation((path: unknown) => {
    if (path === "/cohorts") {
      return {
        refetch: vi.fn(),
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

      expect(screen.getByRole("status")).toHaveTextContent(text);
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

      expect(screen.getByRole("status")).toHaveTextContent("Cohorte creada correctamente.");
    });

    it("sin aviso (o con uno desconocido) no muestra nada ni toca la URL", () => {
      window.history.replaceState(null, "", "/admin/cohorts?aviso=otra-cosa");
      searchParams = new URLSearchParams("aviso=otra-cosa");
      mockFetchResults({});

      render(<CohortsPage />);

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(window.location.search).toBe("?aviso=otra-cosa");
    });
  });
});
