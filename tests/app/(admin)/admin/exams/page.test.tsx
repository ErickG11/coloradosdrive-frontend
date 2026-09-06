import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ExamsPage from "@/app/(admin)/admin/exams/page";
import { useFetch } from "@/hooks/useFetch";
import type { Course, Exam } from "@/types";

vi.mock("@/hooks/useFetch", () => ({
  useFetch: vi.fn(),
}));

const mockedUseFetch = vi.mocked(useFetch);

const exams: Exam[] = [
  {
    id: "exam-1",
    courseId: "course-a",
    title: "Examen de práctica - Señales",
    type: "practica",
    timeLimitMinutes: 30,
    passingScorePercent: 70,
    isPublished: true,
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
  exams?: { data: Exam[] | null; isLoading: boolean; error: string | null };
  courses?: { data: Course[] | null; isLoading: boolean; error: string | null };
}) {
  mockedUseFetch.mockImplementation((path: unknown) => {
    if (path === "/exams") {
      return {
        refetch: vi.fn(),
        ...(options.exams ?? { data: [], isLoading: false, error: null }),
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

describe("ExamsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el estado de carga", () => {
    mockFetchResults({
      exams: { data: null, isLoading: true, error: null },
      courses: { data: null, isLoading: true, error: null },
    });

    render(<ExamsPage />);

    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("muestra el error si falla la carga", () => {
    mockFetchResults({
      exams: { data: null, isLoading: false, error: "No se pudo conectar con el servidor." },
    });

    render(<ExamsPage />);

    expect(screen.getByText("No se pudo conectar con el servidor.")).toBeInTheDocument();
  });

  it("muestra un mensaje cuando no hay exámenes", () => {
    mockFetchResults({});

    render(<ExamsPage />);

    expect(screen.getByText("Todavía no hay exámenes.")).toBeInTheDocument();
  });

  it("renderiza el examen con el curso unido del lado del cliente, tipo y estado de publicación", () => {
    mockFetchResults({
      exams: { data: exams, isLoading: false, error: null },
      courses: { data: courses, isLoading: false, error: null },
    });

    render(<ExamsPage />);

    expect(screen.getByText("Examen de práctica - Señales")).toBeInTheDocument();
    expect(screen.getByText("Motocicletas (Tipo A)")).toBeInTheDocument();
    expect(screen.getByText("Práctica")).toBeInTheDocument();
    expect(screen.getByText("Sí")).toBeInTheDocument();
  });
});
