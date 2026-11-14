import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TakeExamPage from "@/app/(student)/student/exams/[id]/page";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Exam, ExamAttempt, ExamForStudent, StartAttemptResult } from "@/types";
import type { AttemptResult } from "@/types/examAttempt";
import type { ActiveStudentAttempt, StudentItem } from "@/types/studentContent";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "exam-1" }),
  useSearchParams: () => new URLSearchParams("course_id=course-a"),
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

function buildItem(overrides: Partial<StudentItem> = {}): StudentItem {
  return {
    id: "item-1",
    subject_id: "subject-1",
    kind: "examen",
    material_id: null,
    exam_id: "exam-1",
    order_index: 1,
    obligatorio: true,
    title: "Examen de práctica - Señales",
    description: null,
    completado: false,
    access: {
      estado: "abierto",
      fuente: "cohorte",
      opens_at: null,
      closes_at: null,
      max_attempts: null,
      extra_minutes: 0,
    },
    intentos_usados: 0,
    intentos_permitidos: null,
    mejor_nota: null,
    intento_en_progreso: null,
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
    startedAt: "2026-01-01T00:00:00Z",
    completedAt: "2026-01-01T00:10:00Z",
    ...overrides,
  };
}

// El plazo lo fija el servidor y se mide con su reloj (server_now), no con el del dispositivo.
function buildActive(overrides: Partial<ActiveStudentAttempt> = {}): ActiveStudentAttempt {
  const base: StartAttemptResult = {
    attemptId: "attempt-1",
    status: "en_progreso",
    startedAt: new Date().toISOString(),
    exam: buildExamForStudent(),
  };
  return {
    ...base,
    deadlineAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    attemptNumber: 1,
    maxAttemptsAplicado: null,
    minutosAplicados: 30,
    ...overrides,
  };
}

type Backend = {
  item?: StudentItem;
  attempts?: ExamAttempt[] | (() => ExamAttempt[]);
  attemptState?: ExamAttempt;
  contextError?: Error;
};

function mockBackend({
  item = buildItem(),
  attempts = [],
  attemptState,
  contextError,
}: Backend = {}) {
  mockedGet.mockImplementation((path: unknown) => {
    if (typeof path !== "string") return Promise.reject(new Error("path inesperado"));
    if (contextError && path.startsWith("/estudiantes/content/"))
      return Promise.reject(contextError);
    if (path === "/estudiantes/content/courses")
      return Promise.resolve([{ course_id: "course-a", nombre: "Curso A", tipo: "B" }]);
    if (path.startsWith("/estudiantes/content/course?"))
      return Promise.resolve({
        course_id: "course-a",
        materias: [
          {
            id: "subject-1",
            course_id: "course-a",
            title: "Señales",
            description: null,
            order_index: 1,
            is_published: true,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
            items: [item],
          },
        ],
        progreso: {
          materias: [],
          global: 0,
          completa: false,
          sin_contenido: false,
          certificado_listo: false,
        },
        continuar: null,
        server_now: new Date().toISOString(),
      });
    if (path === "/exams/exam-1/attempts/me")
      return Promise.resolve(typeof attempts === "function" ? attempts() : attempts);
    if (path.startsWith("/attempts/") && attemptState) return Promise.resolve(attemptState);
    return Promise.reject(new Error(`api.get mockeado con un path inesperado: ${path}`));
  });
}

const inProgress = (startedAt = new Date().toISOString()) =>
  buildAttempt({
    status: "en_progreso",
    scorePercent: null,
    passed: null,
    startedAt,
    completedAt: null,
  });

describe("imágenes en el intento del alumno", () => {
  const image = {
    url: "https://signed.example.invalid/initial?token=secreto",
    alt: "Señal triangular",
  };
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
  });
  function activeWithImage() {
    const exam = buildExamForStudent();
    return buildActive({
      exam: { ...exam, questions: exam.questions.map((question) => ({ ...question, image })) },
    });
  }
  it("renueva con /images y conserva respuestas, reloj y el mismo intento sin persistir URLs", async () => {
    const user = userEvent.setup();
    mockBackend();
    const original = mockedGet.getMockImplementation()!;
    mockedGet.mockImplementation((path, options) =>
      path === "/attempts/attempt-1/images"
        ? Promise.resolve([
            {
              questionId: "question-1",
              url: "https://signed.example.invalid/renewed?token=nuevo",
              alt: "Señal triangular",
            },
          ])
        : original(path, options),
    );
    mockedPost.mockResolvedValueOnce(activeWithImage());
    render(<TakeExamPage />);
    await user.click(await screen.findByRole("button", { name: "Iniciar examen" }));
    await user.click(screen.getByLabelText("Precaución"));
    const clock = screen.getByRole("timer").textContent;
    fireEvent.error(screen.getByAltText(image.alt));
    await user.click(screen.getByRole("button", { name: "Reintentar imagen de la pregunta 1" }));
    await waitFor(() =>
      expect(screen.getByAltText(image.alt)).toHaveAttribute(
        "src",
        "https://signed.example.invalid/renewed?token=nuevo",
      ),
    );
    expect(mockedGet).toHaveBeenCalledWith(
      "/attempts/attempt-1/images",
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
    expect(mockedGet.mock.calls.some(([path]) => path === "/attempts/attempt-1")).toBe(false);
    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Precaución")).toBeChecked();
    const seconds = (text: string | null) => {
      const [minutes, seconds] = (text ?? "0:0").split(":").map(Number);
      return minutes * 60 + seconds;
    };
    expect(seconds(screen.getByRole("timer").textContent)).toBeLessThanOrEqual(seconds(clock));
    expect(seconds(clock) - seconds(screen.getByRole("timer").textContent)).toBeLessThanOrEqual(2);
    expect(JSON.parse(sessionStorage.getItem("content-attempt:attempt-1")!)).toEqual({
      "question-1": "option-1",
    });
    expect(JSON.stringify({ ...sessionStorage })).not.toMatch(/signed\.example|token=|image_path/);
  });
  it("409 vencido reconcilia resultado y no reinicia ni envía el examen", async () => {
    const user = userEvent.setup();
    mockBackend({ attemptState: buildAttempt({ passed: false, scorePercent: 0 }) });
    const original = mockedGet.getMockImplementation()!;
    mockedGet.mockImplementation((path, options) =>
      path === "/attempts/attempt-1/images"
        ? Promise.reject(new ApiError("privado", 409, { code: "ATTEMPT_EXPIRED" }))
        : original(path, options),
    );
    mockedPost.mockResolvedValueOnce(activeWithImage());
    render(<TakeExamPage />);
    await user.click(await screen.findByRole("button", { name: "Iniciar examen" }));
    await user.click(screen.getByLabelText("Precaución"));
    fireEvent.error(screen.getByAltText(image.alt));
    await user.click(screen.getByRole("button", { name: "Reintentar imagen de la pregunta 1" }));
    expect(await screen.findByRole("region", { name: "Resultado del examen" })).toHaveTextContent(
      "Reprobado",
    );
    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("content-attempt:attempt-1")).toBeNull();
  });
  it("lightbox conserva borrador, Escape devuelve foco y el resultado muestra la imagen sin correctas", async () => {
    const user = userEvent.setup();
    mockBackend();
    const active = activeWithImage();
    mockedPost.mockResolvedValueOnce(active);
    mockedPost.mockResolvedValueOnce({
      attemptId: "attempt-1",
      examId: "exam-1",
      status: "completado",
      scorePercent: 100,
      passed: true,
      startedAt: active.startedAt,
      completedAt: new Date().toISOString(),
      answers: [
        {
          questionId: "question-1",
          prompt: active.exam.questions[0].prompt,
          pointsEarned: 10,
          pointsPossible: 10,
          similarityScore: null,
        },
      ],
    } satisfies AttemptResult);
    render(<TakeExamPage />);
    await user.click(await screen.findByRole("button", { name: "Iniciar examen" }));
    await user.click(screen.getByLabelText("Precaución"));
    fireEvent.load(screen.getByAltText(image.alt));
    const trigger = screen.getByRole("button", { name: "Ampliar imagen de la pregunta 1" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Imagen de la pregunta 1" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(screen.getByLabelText("Precaución")).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Revisar y enviar respuestas" }));
    await user.click(screen.getByRole("button", { name: "Enviar examen" }));
    const result = await screen.findByRole("region", { name: "Resultado del examen" });
    expect(within(result).getByAltText(image.alt)).toBeInTheDocument();
    expect(within(result).queryByText("Correcta")).not.toBeInTheDocument();
  });
  it("el lightbox no impide el envío automático al acercarse el plazo", async () => {
    const user = userEvent.setup();
    mockBackend();
    mockedPost.mockResolvedValueOnce(activeWithImage());
    mockedPost.mockResolvedValueOnce({
      attemptId: "attempt-1",
      examId: "exam-1",
      status: "completado",
      scorePercent: 0,
      passed: false,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      answers: [],
    } satisfies AttemptResult);
    render(<TakeExamPage />);
    await user.click(await screen.findByRole("button", { name: "Iniciar examen" }));
    fireEvent.load(screen.getByAltText(image.alt));
    await user.click(screen.getByRole("button", { name: "Ampliar imagen de la pregunta 1" }));
    const sampled = performance.now();
    const monotonic = vi.spyOn(performance, "now").mockReturnValue(sampled + 30 * 60_000 - 5000);
    try {
      await waitFor(
        () =>
          expect(mockedPost).toHaveBeenCalledWith("/attempts/attempt-1/submit", { answers: [] }),
        { timeout: 4000 },
      );
    } finally {
      monotonic.mockRestore();
    }
    expect(await screen.findByRole("region", { name: "Resultado del examen" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("TakeExamPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("sin intentos previos: muestra la pantalla previa con los metadatos del examen", async () => {
    mockBackend();

    render(<TakeExamPage />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Examen de práctica - Señales" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Intentos usados: 0 \/ ∞/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar examen" })).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("mientras carga muestra el estado de carga y el enlace de regreso al curso", () => {
    mockedGet.mockReturnValue(new Promise(() => {}));

    render(<TakeExamPage />);

    expect(screen.getByRole("status", { name: "Cargando contenido" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Volver al curso" })).toBeInTheDocument();
  });

  it("si el examen no existe en el curso muestra el error con salida", async () => {
    mockBackend({ contextError: new ApiError("No encontrado", 404, { code: "ITEM_NOT_FOUND" }) });

    render(<TakeExamPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El contenido ya no está disponible. Actualiza la página.",
    );
    expect(screen.getByRole("link", { name: "← Volver al curso" })).toBeInTheDocument();
  });

  it("al comenzar, inicia el intento y muestra las preguntas para responder", async () => {
    const user = userEvent.setup();
    mockBackend();
    mockedPost.mockResolvedValueOnce(buildActive());

    render(<TakeExamPage />);
    await user.click(await screen.findByRole("button", { name: "Iniciar examen" }));

    expect(mockedPost).toHaveBeenCalledWith("/exams/exam-1/attempts");
    expect(
      await screen.findByText("¿Qué significa una señal triangular roja?"),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Precaución" })).toBeInTheDocument();
    expect(screen.getByRole("timer", { name: "Tiempo restante" })).toBeInTheDocument();
    // Nunca debe verse un indicio de cuál opción es correcta.
    expect(screen.queryByText(/correcta/i)).not.toBeInTheDocument();
  });

  it("envía las respuestas seleccionadas y muestra el resultado calificado sin revelar correctas", async () => {
    const user = userEvent.setup();
    let attempts: ExamAttempt[] = [];
    mockBackend({ attempts: () => attempts });
    const active = buildActive();
    mockedPost.mockResolvedValueOnce(active);

    render(<TakeExamPage />);
    await user.click(await screen.findByRole("button", { name: "Iniciar examen" }));
    await user.click(await screen.findByRole("radio", { name: "Precaución" }));

    const attemptResult: AttemptResult = {
      attemptId: "attempt-1",
      examId: "exam-1",
      status: "completado",
      scorePercent: 100,
      passed: true,
      startedAt: active.startedAt,
      completedAt: new Date().toISOString(),
      answers: [
        {
          questionId: "question-1",
          prompt: "¿Qué significa una señal triangular roja?",
          pointsEarned: 10,
          pointsPossible: 10,
          similarityScore: null,
        },
      ],
    };
    mockedPost.mockResolvedValueOnce(attemptResult);
    attempts = [buildAttempt({ scorePercent: 100, passed: true, startedAt: active.startedAt })];

    // Enviar abre una confirmación: una vez enviado no se pueden cambiar respuestas.
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    await user.click(await screen.findByRole("button", { name: "Enviar examen" }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith("/attempts/attempt-1/submit", {
        answers: [{ questionId: "question-1", selectedOptionId: "option-1" }],
      });
    });
    expect(await screen.findByRole("region", { name: "Resultado del examen" })).toHaveTextContent(
      "Aprobado",
    );
    expect(screen.getByText("10 / 10 pts")).toBeInTheDocument();
    expect(screen.queryByText(/correcta/i)).not.toBeInTheDocument();
  });

  it("definitivo reprobado con su único intento usado: muestra el resumen sin opción de reintentar", async () => {
    mockBackend({
      item: buildItem({ intentos_usados: 1, intentos_permitidos: 1, mejor_nota: 40 }),
      attempts: [buildAttempt({ scorePercent: 40, passed: false })],
    });

    render(<TakeExamPage />);

    const result = await screen.findByRole("region", { name: "Resultado del examen" });
    expect(result).toHaveTextContent("Reprobado");
    expect(screen.getByText("No hay más intentos disponibles por ahora.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Intentar de nuevo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar examen" })).not.toBeInTheDocument();
  });

  it("definitivo ya aprobado: el servidor decide y nunca se vuelve a iniciar", async () => {
    const user = userEvent.setup();
    mockBackend({
      item: buildItem({ completado: true, intentos_usados: 1, intentos_permitidos: 3 }),
      attempts: [buildAttempt({ scorePercent: 90, passed: true })],
    });
    mockedPost.mockResolvedValueOnce(
      buildActive({ exam: buildExamForStudent({ type: "definitivo" }) }),
    );

    render(<TakeExamPage />);
    await screen.findByRole("region", { name: "Resultado del examen" });
    expect(
      screen.getByText(/Un definitivo aprobado nunca se vuelve a iniciar/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Comprobar nuevo intento" }));
    expect(mockedPost).toHaveBeenCalledWith("/exams/exam-1/attempts");
  });

  it("examen de práctica ya completado: permite volver a tomarlo", async () => {
    const user = userEvent.setup();
    mockBackend({
      item: buildItem({ intentos_usados: 1, mejor_nota: 90 }),
      attempts: [buildAttempt()],
    });
    mockedPost.mockResolvedValueOnce(buildActive({ attemptId: "attempt-2", attemptNumber: 2 }));

    render(<TakeExamPage />);
    await user.click(await screen.findByRole("button", { name: "Intentar de nuevo" }));

    expect(mockedPost).toHaveBeenCalledWith("/exams/exam-1/attempts");
    expect(
      await screen.findByText("¿Qué significa una señal triangular roja?"),
    ).toBeInTheDocument();
  });

  it("retoma un intento en_progreso: ofrece continuar, verifica su estado y lo reanuda", async () => {
    const user = userEvent.setup();
    const startedAt = new Date().toISOString();
    const deadline = new Date(Date.now() + 20 * 60_000).toISOString();
    mockBackend({
      item: buildItem({
        intentos_usados: 1,
        intento_en_progreso: { id: "attempt-1", deadline_at: deadline },
      }),
      attempts: [inProgress(startedAt)],
      attemptState: inProgress(startedAt),
    });
    mockedPost.mockResolvedValueOnce(buildActive({ deadlineAt: deadline, startedAt }));

    render(<TakeExamPage />);
    await user.click(await screen.findByRole("button", { name: "Continuar intento" }));

    expect(mockedGet).toHaveBeenCalledWith("/attempts/attempt-1", { cache: "no-store" });
    expect(mockedPost).toHaveBeenCalledWith("/exams/exam-1/attempts");
    expect(
      await screen.findByText("¿Qué significa una señal triangular roja?"),
    ).toBeInTheDocument();
  });

  it("autoenvía las respuestas cuando faltan menos de 10 segundos para el plazo del servidor", async () => {
    const user = userEvent.setup();
    mockBackend();
    mockedPost.mockResolvedValueOnce(
      buildActive({ deadlineAt: new Date(Date.now() + 5_000).toISOString() }),
    );
    mockedPost.mockResolvedValueOnce({
      attemptId: "attempt-1",
      examId: "exam-1",
      status: "completado",
      scorePercent: 0,
      passed: false,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      answers: [],
    } satisfies AttemptResult);

    render(<TakeExamPage />);
    await user.click(await screen.findByRole("button", { name: "Iniciar examen" }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith("/attempts/attempt-1/submit", { answers: [] });
    });
  });

  it("si el plazo ya terminó, consulta el estado del servidor en vez de enviar respuestas", async () => {
    const user = userEvent.setup();
    const startedAt = new Date(Date.now() - 60 * 60_000).toISOString();
    mockBackend({
      attemptState: buildAttempt({ scorePercent: 0, passed: false, startedAt }),
    });
    mockedPost.mockResolvedValueOnce(
      buildActive({ deadlineAt: new Date(Date.now() - 1_000).toISOString(), startedAt }),
    );

    render(<TakeExamPage />);
    await user.click(await screen.findByRole("button", { name: "Iniciar examen" }));

    expect(await screen.findByRole("region", { name: "Resultado del examen" })).toHaveTextContent(
      "Reprobado",
    );
    expect(mockedPost).not.toHaveBeenCalledWith("/attempts/attempt-1/submit", expect.anything());
  });

  it("si el backend ya finalizó el intento (409) al enviar, muestra el resumen y el aviso en vez de dejar al estudiante sin salida", async () => {
    const user = userEvent.setup();
    const active = buildActive();
    mockBackend({
      attemptState: buildAttempt({ scorePercent: 0, passed: false, startedAt: active.startedAt }),
    });
    mockedPost.mockResolvedValueOnce(active);
    mockedPost.mockRejectedValueOnce(
      new ApiError("El tiempo límite de este examen ya expiró", 409, { code: "ATTEMPT_EXPIRED" }),
    );

    render(<TakeExamPage />);
    await user.click(await screen.findByRole("button", { name: "Iniciar examen" }));
    await user.click(await screen.findByRole("button", { name: "Revisar y enviar respuestas" }));
    await user.click(await screen.findByRole("button", { name: "Enviar examen" }));

    expect(await screen.findByRole("region", { name: "Resultado del examen" })).toHaveTextContent(
      "Reprobado",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("El tiempo del intento terminó");
    expect(screen.getByRole("link", { name: "← Volver al curso" })).toBeInTheDocument();
    expect(screen.queryByText("Incorrecta")).not.toBeInTheDocument();
  });

  it("si el envío manual falla por un error que no sea 409, muestra el error con un enlace de salida y deja reintentar", async () => {
    const user = userEvent.setup();
    const active = buildActive();
    mockBackend({ attemptState: inProgress(active.startedAt) });
    mockedPost.mockResolvedValueOnce(active);
    mockedPost.mockRejectedValueOnce(new ApiError("Error interno del servidor.", 500));

    render(<TakeExamPage />);
    await user.click(await screen.findByRole("button", { name: "Iniciar examen" }));
    await user.click(await screen.findByRole("button", { name: "Revisar y enviar respuestas" }));
    await user.click(await screen.findByRole("button", { name: "Enviar examen" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo conectar con Contenido. Intenta de nuevo.",
    );
    expect(
      screen.getByRole("link", { name: "← Volver al curso (el tiempo sigue corriendo)" }),
    ).toBeInTheDocument();
    // El formulario sigue disponible para reintentar, no es un callejón sin salida.
    expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();
  });
});
