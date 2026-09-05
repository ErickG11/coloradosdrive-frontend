import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StudentExamsPage from "@/app/(student)/student/exams/page";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Exam, ExamAttempt } from "@/types";

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);

function buildExam(overrides: Partial<Exam> = {}): Exam {
  return {
    id: "exam-1",
    courseId: "course-a",
    title: "Examen de práctica - Señales",
    type: "practica",
    timeLimitMinutes: 30,
    passingScorePercent: 70,
    isPublished: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function buildAttempt(overrides: Partial<ExamAttempt> = {}): ExamAttempt {
  return {
    id: "attempt-1",
    examId: "exam-1",
    studentId: "student-1",
    status: "completado",
    scorePercent: 90,
    passed: true,
    startedAt: "2026-01-02T00:00:00Z",
    completedAt: "2026-01-02T00:10:00Z",
    ...overrides,
  };
}

function mockExamsAndAttempts(exams: Exam[], attemptsByExamId: Record<string, ExamAttempt[]>) {
  mockedGet.mockImplementation((path: unknown) => {
    if (path === "/exams") {
      return Promise.resolve(exams);
    }
    const match = typeof path === "string" && /^\/exams\/(.+)\/attempts\/me$/.exec(path);
    if (match) {
      return Promise.resolve(attemptsByExamId[match[1]] ?? []);
    }
    return Promise.reject(new Error(`api.get mockeado con un path inesperado: ${String(path)}`));
  });
}

describe("StudentExamsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el estado de carga", () => {
    mockedGet.mockReturnValue(new Promise(() => {}));

    render(<StudentExamsPage />);

    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("muestra el error si falla la carga", async () => {
    mockedGet.mockRejectedValue(new ApiError("No tienes permisos para realizar esta acción.", 403));

    render(<StudentExamsPage />);

    expect(
      await screen.findByText("No tienes permisos para realizar esta acción."),
    ).toBeInTheDocument();
  });

  it("muestra un mensaje cuando no hay exámenes disponibles", async () => {
    mockExamsAndAttempts([], {});

    render(<StudentExamsPage />);

    expect(
      await screen.findByText("Todavía no hay exámenes disponibles para tu curso."),
    ).toBeInTheDocument();
  });

  it("examen sin intentos: muestra Disponible y Tomar examen", async () => {
    mockExamsAndAttempts([buildExam()], { "exam-1": [] });

    render(<StudentExamsPage />);

    expect(await screen.findByText("Disponible")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tomar examen" })).toHaveAttribute(
      "href",
      "/student/exams/exam-1",
    );
  });

  it("intento en_progreso: muestra Continuar examen", async () => {
    mockExamsAndAttempts([buildExam()], {
      "exam-1": [buildAttempt({ status: "en_progreso", scorePercent: null, passed: null })],
    });

    render(<StudentExamsPage />);

    expect(await screen.findByText("En progreso")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continuar examen" })).toBeInTheDocument();
  });

  it("definitivo ya aprobado: muestra Aprobado y Ver resultado, sin opción de reintentar", async () => {
    mockExamsAndAttempts([buildExam({ type: "definitivo" })], {
      "exam-1": [buildAttempt({ passed: true })],
    });

    render(<StudentExamsPage />);

    expect(await screen.findByText("Aprobado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver resultado" })).toBeInTheDocument();
  });

  it("práctica reprobada: sigue ofreciendo reintentar (intentos ilimitados)", async () => {
    mockExamsAndAttempts([buildExam({ type: "practica" })], {
      "exam-1": [buildAttempt({ passed: false })],
    });

    render(<StudentExamsPage />);

    expect(await screen.findByText("Reprobado (último intento)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tomar examen de nuevo" })).toBeInTheDocument();
  });

  it("consulta el historial de cada examen por separado (GET /exams/:id/attempts/me)", async () => {
    mockExamsAndAttempts([buildExam({ id: "exam-1" }), buildExam({ id: "exam-2" })], {
      "exam-1": [],
      "exam-2": [buildAttempt({ examId: "exam-2" })],
    });

    render(<StudentExamsPage />);

    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith("/exams/exam-1/attempts/me");
      expect(mockedGet).toHaveBeenCalledWith("/exams/exam-2/attempts/me");
    });
  });
});
