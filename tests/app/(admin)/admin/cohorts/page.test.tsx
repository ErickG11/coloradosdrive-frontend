import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CohortsPage from "@/app/(admin)/admin/cohorts/page";
import { useFetch } from "@/hooks/useFetch";
import type { Cohort, Course } from "@/types";

vi.mock("@/hooks/useFetch", () => ({
  useFetch: vi.fn(),
}));

const mockedUseFetch = vi.mocked(useFetch);

const cohorts: Cohort[] = [
  {
    id: "cohort-1",
    courseId: "course-a",
    nombre: "Cohorte Marzo",
    precio: 150,
    cupoMaximo: 20,
    fechaInicio: "2026-03-01",
    fechaFin: "2026-06-01",
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
});
