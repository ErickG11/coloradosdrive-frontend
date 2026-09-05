import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TakeExamPage from "@/app/(student)/student/exams/[id]/page";
import { api } from "@/lib/api/client";
import type { AttemptResult, Exam, ExamAttempt, ExamForStudent, StartAttemptResult } from "@/types";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "exam-1" }),
}));

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);

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

function buildExamForStudent(overrides: Partial<ExamForStudent> = {}): ExamForStudent {
  return {
    ...buildExam(),
    questions: [
      {
        id: "question-1",
        examId: "exam-1",
        type: "opcion_multiple",
        prompt: "¿Qué significa una señal triangular roja?",
        orderIndex: 1,
        points: 10,
        options: [
          { id: "option-1", questionId: "question-1", optionText: "Precaución", orderIndex: 1 },
          { id: "option-2", questionId: "question-1", optionText: "Prohibido", orderIndex: 2 },
        ],
      },
    ],
    ...overrides,
  };
}

function mockGetByPath(handlers: Record<string, unknown>) {
  mockedGet.mockImplementation((path: unknown) => {
    if (typeof path === "string" && path in handlers) {
      return Promise.resolve(handlers[path]);
    }
    return Promise.reject(new Error(`api.get mockeado con un path inesperado: ${String(path)}`));
  });
}

describe("TakeExamPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin intentos previos: muestra la pantalla previa con los metadatos del examen", async () => {
    mockGetByPath({ "/exams": [buildExam()], "/exams/exam-1/attempts/me": [] });

    render(<TakeExamPage />);

    expect(await screen.findByText("Examen de práctica - Señales")).toBeInTheDocument();
    expect(screen.getByText("30 minutos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comenzar examen" })).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("al comenzar, inicia el intento y muestra las preguntas para responder", async () => {
    const user = userEvent.setup();
    mockGetByPath({ "/exams": [buildExam()], "/exams/exam-1/attempts/me": [] });
    const startResult: StartAttemptResult = {
      attemptId: "attempt-1",
      status: "en_progreso",
      startedAt: new Date().toISOString(),
      exam: buildExamForStudent(),
    };
    mockedPost.mockResolvedValueOnce(startResult);

    render(<TakeExamPage />);
    await user.click(await screen.findByRole("button", { name: "Comenzar examen" }));

    expect(mockedPost).toHaveBeenCalledWith("/exams/exam-1/attempts");
    expect(
      await screen.findByText("¿Qué significa una señal triangular roja?"),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Precaución" })).toBeInTheDocument();
    // Nunca debe verse un indicio de cuál opción es correcta.
    expect(screen.queryByText(/correcta/i)).not.toBeInTheDocument();
  });

  it("envía las respuestas seleccionadas y muestra el detalle calificado", async () => {
    const user = userEvent.setup();
    mockGetByPath({ "/exams": [buildExam()], "/exams/exam-1/attempts/me": [] });
    const startResult: StartAttemptResult = {
      attemptId: "attempt-1",
      status: "en_progreso",
      startedAt: new Date().toISOString(),
      exam: buildExamForStudent(),
    };
    mockedPost.mockResolvedValueOnce(startResult);

    render(<TakeExamPage />);
    await user.click(await screen.findByRole("button", { name: "Comenzar examen" }));
    await user.click(await screen.findByRole("radio", { name: "Precaución" }));

    const attemptResult: AttemptResult = {
      attemptId: "attempt-1",
      examId: "exam-1",
      status: "completado",
      scorePercent: 100,
      passed: true,
      startedAt: startResult.startedAt,
      completedAt: new Date().toISOString(),
      answers: [
        {
          questionId: "question-1",
          prompt: "¿Qué significa una señal triangular roja?",
          isCorrect: true,
          pointsEarned: 10,
          pointsPossible: 10,
          similarityScore: null,
        },
      ],
    };
    mockedPost.mockResolvedValueOnce(attemptResult);

    await user.click(screen.getByRole("button", { name: "Enviar respuestas" }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith("/attempts/attempt-1/submit", {
        answers: [{ questionId: "question-1", selectedOptionId: "option-1" }],
      });
    });
    expect(await screen.findByText("100.00% — Aprobado")).toBeInTheDocument();
    expect(screen.getByText("Correcta — 10/10 pts")).toBeInTheDocument();
  });

  it("examen definitivo ya completado: muestra el resumen sin opción de reintentar", async () => {
    const attempt: ExamAttempt = {
      id: "attempt-1",
      examId: "exam-1",
      studentId: "student-1",
      status: "completado",
      scorePercent: 40,
      passed: false,
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: "2026-01-01T00:10:00Z",
    };
    mockGetByPath({
      "/exams": [buildExam({ type: "definitivo" })],
      "/exams/exam-1/attempts/me": [attempt],
    });

    render(<TakeExamPage />);

    expect(await screen.findByText("40.00% — Reprobado")).toBeInTheDocument();
    expect(
      screen.getByText("Este examen es definitivo: ya usaste tu único intento permitido."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tomar examen de nuevo" })).not.toBeInTheDocument();
  });

  it("examen de práctica ya completado: permite volver a tomarlo", async () => {
    const user = userEvent.setup();
    const attempt: ExamAttempt = {
      id: "attempt-1",
      examId: "exam-1",
      studentId: "student-1",
      status: "completado",
      scorePercent: 90,
      passed: true,
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: "2026-01-01T00:10:00Z",
    };
    mockGetByPath({
      "/exams": [buildExam({ type: "practica" })],
      "/exams/exam-1/attempts/me": [attempt],
    });
    const startResult: StartAttemptResult = {
      attemptId: "attempt-2",
      status: "en_progreso",
      startedAt: new Date().toISOString(),
      exam: buildExamForStudent(),
    };
    mockedPost.mockResolvedValueOnce(startResult);

    render(<TakeExamPage />);
    await user.click(await screen.findByRole("button", { name: "Tomar examen de nuevo" }));

    expect(mockedPost).toHaveBeenCalledWith("/exams/exam-1/attempts");
    expect(
      await screen.findByText("¿Qué significa una señal triangular roja?"),
    ).toBeInTheDocument();
  });

  it("retoma automáticamente un intento en_progreso sin mostrar la pantalla previa", async () => {
    const inProgress: ExamAttempt = {
      id: "attempt-1",
      examId: "exam-1",
      studentId: "student-1",
      status: "en_progreso",
      scorePercent: null,
      passed: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    mockGetByPath({
      "/exams": [buildExam()],
      "/exams/exam-1/attempts/me": [inProgress],
    });
    mockedPost.mockResolvedValueOnce({
      attemptId: "attempt-1",
      status: "en_progreso",
      startedAt: inProgress.startedAt,
      exam: buildExamForStudent(),
    } satisfies StartAttemptResult);

    render(<TakeExamPage />);

    expect(
      await screen.findByText("¿Qué significa una señal triangular roja?"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Comenzar examen" })).not.toBeInTheDocument();
    expect(mockedPost).toHaveBeenCalledWith("/exams/exam-1/attempts");
  });

  it("autoenvía las respuestas cuando el cronómetro visual llega a cero", async () => {
    mockGetByPath({ "/exams": [buildExam()], "/exams/exam-1/attempts/me": [] });
    // startedAt muy en el pasado respecto a timeLimitMinutes: el
    // cronómetro visual arranca ya en 0.
    const longAgo = new Date(Date.now() - 60 * 60_000).toISOString();
    mockedPost.mockResolvedValueOnce({
      attemptId: "attempt-1",
      status: "en_progreso",
      startedAt: longAgo,
      exam: buildExamForStudent(),
    } satisfies StartAttemptResult);
    mockedPost.mockResolvedValueOnce({
      attemptId: "attempt-1",
      examId: "exam-1",
      status: "completado",
      scorePercent: 0,
      passed: false,
      startedAt: longAgo,
      completedAt: new Date().toISOString(),
      answers: [],
    } satisfies AttemptResult);

    render(<TakeExamPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Comenzar examen" }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith("/attempts/attempt-1/submit", { answers: [] });
    });
  });
});
