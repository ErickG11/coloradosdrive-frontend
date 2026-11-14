import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExamForm, type ExamFormValues } from "@/app/(admin)/admin/exams/ExamForm";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Course, ExamWithQuestions } from "@/types";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);
const mockedPatch = vi.mocked(api.patch);
const mockedDelete = vi.mocked(api.delete);

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

function fillRequiredExamFields() {
  fireEvent.change(screen.getByLabelText("Curso"), { target: { value: "course-a" } });
  fireEvent.change(screen.getByLabelText("Título"), {
    target: { value: "Examen de práctica - Señales" },
  });
  fireEvent.change(screen.getByLabelText("Tiempo límite (minutos)"), { target: { value: "30" } });
  fireEvent.change(screen.getByLabelText("Nota mínima (%)"), {
    target: { value: "70" },
  });
}

function fillFirstQuestionAsMultipleChoice() {
  fireEvent.change(screen.getByLabelText("Pregunta 1 - Enunciado"), {
    target: { value: "¿Qué significa una señal triangular roja?" },
  });
  fireEvent.change(screen.getByLabelText("Pregunta 1 - Opción 1"), {
    target: { value: "Precaución" },
  });
  fireEvent.change(screen.getByLabelText("Pregunta 1 - Opción 2"), {
    target: { value: "Prohibido" },
  });
}

// Quitar una pregunta ahora exige confirmar escribiendo ELIMINAR (se aplica al guardar).
async function removeQuestion(user: ReturnType<typeof userEvent.setup>, button: HTMLElement) {
  await user.click(button);
  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByLabelText(/Escribe ELIMINAR/), "ELIMINAR");
  await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));
}

// Tras guardar, el formulario relee el examen (GET /exams/:id) y se queda en la pantalla.
function savedExam(overrides: Partial<ExamWithQuestions> = {}): ExamWithQuestions {
  return {
    id: "exam-1",
    courseId: "course-a",
    title: "Examen de práctica - Señales",
    type: "practica",
    timeLimitMinutes: 30,
    passingScorePercent: 70,
    isPublished: false,
    createdAt: "",
    updatedAt: "",
    questions: [],
    ...overrides,
  };
}

describe("ExamForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGet.mockResolvedValue(savedExam());
  });

  it("marca los campos requeridos del examen", () => {
    render(<ExamForm courses={courses} />);

    expect(screen.getByLabelText("Curso")).toBeRequired();
    expect(screen.getByRole("radio", { name: /^Práctica/ })).toBeRequired();
    expect(screen.getByRole("radio", { name: /^Definitivo/ })).toBeRequired();
    expect(screen.getByLabelText("Título")).toBeRequired();
    expect(screen.getByLabelText("Tiempo límite (minutos)")).toBeRequired();
    expect(screen.getByLabelText("Nota mínima (%)")).toBeRequired();
  });

  it.each([false, true])(
    "definitivo nuevo precarga 1; vaciarlo advierte y envía null (vacío=%s)",
    async (unlimited) => {
      const user = userEvent.setup();
      mockedPost.mockResolvedValue(savedExam());
      render(<ExamForm courses={courses} />);
      fillRequiredExamFields();
      fillFirstQuestionAsMultipleChoice();
      await user.click(screen.getByRole("radio", { name: /^Definitivo/ }));
      const limit = screen.getByLabelText("Intentos por defecto (vacío = ilimitados)");
      expect(limit).toHaveValue(1);
      expect(screen.queryByText(/Este definitivo permitirá/)).not.toBeInTheDocument();
      if (unlimited) {
        fireEvent.change(limit, { target: { value: "" } });
        expect(
          screen.getByText(/Este definitivo permitirá intentos ilimitados hasta aprobar/),
        ).toBeInTheDocument();
      }
      expect(
        screen.getByText(
          "Se usa si la habilitación no define un límite propio. Vacío = ilimitado.",
        ),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
      expect(mockedPost).toHaveBeenCalledWith(
        "/exams",
        expect.objectContaining({ type: "definitivo", maxAttemptsDefault: unlimited ? null : 1 }),
      );
    },
  );

  it("avisa antes de salir con cambios y permite cancelar la navegación", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ExamForm courses={courses} />);
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Borrador local" } });
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    await user.click(screen.getByRole("link", { name: "Volver a exámenes" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("cambios sin guardar"));
    expect(screen.getByLabelText("Título")).toHaveValue("Borrador local");
    confirm.mockRestore();
  });

  it("vista previa no revela claves ni marca la opción correcta; Escape devuelve el foco", async () => {
    const user = userEvent.setup();
    render(<ExamForm courses={courses} />);
    fillFirstQuestionAsMultipleChoice();
    const trigger = screen.getByRole("button", { name: "Vista previa del alumno" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Precaución")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/es correcta/)).not.toBeInTheDocument();
    expect(
      within(dialog)
        .getAllByRole("radio")
        .every((radio) => !(radio as HTMLInputElement).checked),
    ).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("una pregunta colapsada se abre al ir a su validación", async () => {
    const user = userEvent.setup();
    render(<ExamForm courses={courses} />);
    const details = document.getElementById("exam-question-0") as HTMLDetailsElement;
    await user.click(within(details).getByText(/Completar enunciado/));
    expect(details.open).toBe(false);
    await user.click(
      within(screen.getByRole("complementary", { name: "Resumen en vivo" })).getByRole("button", {
        name: "Escribe el enunciado de la pregunta 1.",
      }),
    );
    expect(details.open).toBe(true);
    expect(screen.getByLabelText("Pregunta 1 - Enunciado")).toHaveFocus();
  });

  it("arranca con una pregunta de opción múltiple con 2 opciones", () => {
    render(<ExamForm courses={courses} />);

    expect(screen.getByLabelText("Pregunta 1 - Enunciado")).toBeInTheDocument();
    expect(screen.getByLabelText("Pregunta 1 - Opción 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Pregunta 1 - Opción 2")).toBeInTheDocument();
    // Con una sola pregunta, no se puede quitar (el examen necesita al menos una).
    expect(screen.getByRole("button", { name: "Quitar Pregunta 1" })).toBeDisabled();
  });

  it("agrega y quita preguntas dinámicamente", async () => {
    const user = userEvent.setup();
    render(<ExamForm courses={courses} />);

    await user.click(screen.getByRole("button", { name: "Agregar pregunta" }));

    expect(screen.getByLabelText("Pregunta 2 - Enunciado")).toBeInTheDocument();
    const removeButtons = screen.getAllByRole("button", { name: /^Quitar Pregunta \d+$/ });
    expect(removeButtons[0]).not.toBeDisabled();

    await removeQuestion(user, removeButtons[1]);

    expect(screen.queryByLabelText("Pregunta 2 - Enunciado")).not.toBeInTheDocument();
  });

  it("no permite quitar una opción si solo quedan 2 en una pregunta de opción múltiple", () => {
    render(<ExamForm courses={courses} />);

    const removeOptionButtons = screen.getAllByRole("button", {
      name: /^Quitar Pregunta \d+ - Opción \d+$/,
    });
    for (const button of removeOptionButtons) {
      expect(button).toBeDisabled();
    }
  });

  it("cambiar el tipo de pregunta a texto abierto reemplaza las opciones por respuesta correcta y sinónimos", async () => {
    const user = userEvent.setup();
    render(<ExamForm courses={courses} />);

    await user.selectOptions(screen.getByLabelText("Pregunta 1 - Tipo"), "texto_abierto");

    expect(screen.queryByLabelText("Pregunta 1 - Opción 1")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Pregunta 1 - Respuesta correcta")).toBeInTheDocument();
  });

  it("en modo creación arma el examen con las preguntas anidadas y envía POST /exams", async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue(savedExam());
    render(<ExamForm courses={courses} />);

    fillRequiredExamFields();
    fillFirstQuestionAsMultipleChoice();

    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith("/exams", {
        courseId: "course-a",
        title: "Examen de práctica - Señales",
        type: "practica",
        description: "",
        maxAttemptsDefault: null,
        shuffleQuestions: false,
        shuffleOptions: false,
        timeLimitMinutes: 30,
        passingScorePercent: 70,
        questions: [
          {
            type: "opcion_multiple",
            prompt: "¿Qué significa una señal triangular roja?",
            orderIndex: 1,
            points: 1,
            options: [
              { optionText: "Precaución", isCorrect: true, orderIndex: 1 },
              { optionText: "Prohibido", isCorrect: false, orderIndex: 2 },
            ],
          },
        ],
      });
    });
    // Ya no redirige: relee el examen guardado y sigue en el formulario (flujo borrador → publicar).
    await waitFor(() =>
      expect(mockedGet).toHaveBeenCalledWith("/exams/exam-1", { cache: "no-store" }),
    );
    expect(pushMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Borrador")).toBeInTheDocument();
  });

  it("Guardar y publicar crea el examen y lo publica con PATCH isPublished", async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue(savedExam());
    mockedPatch.mockResolvedValue({});
    mockedGet.mockResolvedValue(savedExam({ isPublished: true }));
    render(<ExamForm courses={courses} />);

    fillRequiredExamFields();
    fillFirstQuestionAsMultipleChoice();
    await user.click(screen.getByRole("button", { name: "Guardar y publicar" }));

    await waitFor(() =>
      expect(mockedPatch).toHaveBeenCalledWith("/exams/exam-1", { isPublished: true }),
    );
    expect(await screen.findByText("Publicado")).toBeInTheDocument();
  });

  it("muestra el mensaje de error del backend si falla el guardado", async () => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValue(new ApiError("El curso indicado no existe", 404));
    render(<ExamForm courses={courses} />);

    fillRequiredExamFields();
    fillFirstQuestionAsMultipleChoice();
    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));

    // El error del backend se traduce a un mensaje en español de Contenido.
    expect(
      await screen.findByText("El contenido ya no está disponible. Actualiza la página."),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  describe("modo edición", () => {
    const initialValues: ExamFormValues = {
      courseId: "course-a",
      title: "Examen definitivo - Señales",
      type: "definitivo",
      timeLimitMinutes: "45",
      passingScorePercent: "80",
      isPublished: false,
      questions: [
        {
          id: "question-1",
          orderIndex: 1,
          type: "opcion_multiple",
          prompt: "Pregunta a eliminar",
          points: "5",
          correctAnswerText: "",
          synonyms: [],
          options: [
            { id: "opt-a", optionText: "A", isCorrect: true },
            { id: "opt-b", optionText: "B", isCorrect: false },
          ],
        },
        {
          id: "question-2",
          orderIndex: 2,
          type: "opcion_multiple",
          prompt: "Pregunta que se mantiene",
          points: "3",
          correctAnswerText: "",
          synonyms: [],
          options: [
            { id: "opt-c", optionText: "C", isCorrect: false },
            { id: "opt-d", optionText: "D", isCorrect: true },
          ],
        },
      ],
    };

    it("reordena sin colisiones: libera posiciones antes de asignar el orden final", async () => {
      const user = userEvent.setup();
      mockedPatch.mockResolvedValue({});
      render(<ExamForm courses={courses} examId="exam-1" initialValues={initialValues} />);
      await user.click(screen.getByRole("button", { name: "Subir Pregunta 2" }));
      expect(screen.getByLabelText("Pregunta 1 - Enunciado")).toHaveValue(
        "Pregunta que se mantiene",
      );
      await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
      await waitFor(() => expect(mockedGet).toHaveBeenCalled());
      expect(mockedPatch.mock.calls).toEqual([
        ["/questions/question-2", { orderIndex: 5 }],
        ["/questions/question-1", { orderIndex: 6 }],
        ["/questions/question-2", { orderIndex: 1 }],
        ["/questions/question-1", { orderIndex: 2 }],
      ]);
    });

    it("duplicar conserva el contenido sin reutilizar ids de pregunta ni opciones", async () => {
      const user = userEvent.setup();
      mockedPatch.mockResolvedValue({});
      mockedPost.mockResolvedValue({});
      render(<ExamForm courses={courses} examId="exam-1" initialValues={initialValues} />);
      await user.click(screen.getByRole("button", { name: "Duplicar Pregunta 1" }));
      expect(screen.getByLabelText("Pregunta 2 - Enunciado")).toHaveValue("Pregunta a eliminar");
      await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
      await waitFor(() =>
        expect(mockedPost).toHaveBeenCalledWith("/exams/exam-1/questions", {
          type: "opcion_multiple",
          prompt: "Pregunta a eliminar",
          points: 5,
          orderIndex: 2,
          options: [
            { optionText: "A", isCorrect: true, orderIndex: 1 },
            { optionText: "B", isCorrect: false, orderIndex: 2 },
          ],
        }),
      );
    });

    it("sin cambios no envía PATCH de metadatos, pero relee el examen", async () => {
      const user = userEvent.setup();
      render(<ExamForm courses={courses} examId="exam-1" initialValues={initialValues} />);
      await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
      await waitFor(() =>
        expect(mockedGet).toHaveBeenCalledWith("/exams/exam-1", { cache: "no-store" }),
      );
      expect(mockedPatch).not.toHaveBeenCalled();
    });

    it("un conflicto de estructura relee y congela los controles sin repetir escrituras", async () => {
      const user = userEvent.setup();
      mockedPatch.mockRejectedValueOnce(
        new ApiError("Conflicto", 409, { code: "EXAM_STRUCTURE_FROZEN" }),
      );
      mockedGet.mockResolvedValue(savedExam());
      render(<ExamForm courses={courses} examId="exam-1" initialValues={initialValues} />);
      fireEvent.change(screen.getByLabelText("Tiempo límite (minutos)"), {
        target: { value: "50" },
      });
      await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
      await waitFor(() => expect(mockedGet).toHaveBeenCalled());
      expect(screen.getByLabelText("Tiempo límite (minutos)")).toBeDisabled();
      expect(mockedPatch).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Este examen ya tiene intentos/)).toBeInTheDocument();
    });

    it("si falla tras guardar y también falla la relectura bloquea reintentos duplicados", async () => {
      const user = userEvent.setup();
      mockedPatch.mockResolvedValueOnce({}).mockRejectedValueOnce(new ApiError("Error", 500));
      mockedGet.mockRejectedValueOnce(new ApiError("Error", 500));
      render(<ExamForm courses={courses} examId="exam-1" initialValues={initialValues} />);
      fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Cambio guardado" } });
      fireEvent.change(screen.getByLabelText("Pregunta 1 - Enunciado"), {
        target: { value: "Cambio fallido" },
      });
      await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
      expect(
        await screen.findByText(/Recarga la página antes de repetir para no duplicar preguntas/),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guardar borrador" })).toBeDisabled();
      expect(mockedPatch).toHaveBeenCalledTimes(2);
    });

    it("con intentos solo cambia textos de opciones y preserva sus ids", async () => {
      const user = userEvent.setup();
      mockedPatch.mockResolvedValue({});
      render(
        <ExamForm courses={courses} examId="exam-1" initialValues={initialValues} hasAttempts />,
      );
      for (const name of ["Duplicar Pregunta 1", "Subir Pregunta 2", "Bajar Pregunta 1"])
        expect(screen.getByRole("button", { name })).toBeDisabled();
      expect(screen.getByLabelText("Intentos por defecto (vacío = ilimitados)")).toBeDisabled();
      fireEvent.change(screen.getByLabelText("Pregunta 1 - Opción 1"), {
        target: { value: "Corrección A" },
      });
      await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
      await waitFor(() => expect(mockedGet).toHaveBeenCalled());
      expect(mockedPatch.mock.calls).toEqual([
        ["/questions/question-1", { optionTexts: [{ id: "opt-a", optionText: "Corrección A" }] }],
      ]);
    });

    it("precarga los valores y deshabilita curso y tipo", () => {
      render(<ExamForm courses={courses} examId="exam-1" initialValues={initialValues} />);

      expect(screen.getByLabelText("Título")).toHaveValue("Examen definitivo - Señales");
      expect(screen.getByLabelText("Curso")).toBeDisabled();
      expect(screen.getByRole("radio", { name: /^Práctica/ })).toBeDisabled();
      expect(screen.getByRole("radio", { name: /^Definitivo/ })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Guardar borrador" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guardar y publicar" })).toBeInTheDocument();
    });

    it("guarda metadata, quita la pregunta eliminada, edita la que se mantiene y agrega la nueva", async () => {
      const user = userEvent.setup();
      mockedPatch.mockResolvedValue({});
      mockedPost.mockResolvedValue({});
      mockedDelete.mockResolvedValue(undefined);

      render(<ExamForm courses={courses} examId="exam-1" initialValues={initialValues} />);

      fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Examen corregido" } });
      // Con 2 preguntas se puede quitar la primera (question-1); con 1
      // sola pregunta el botón queda deshabilitado a propósito (regla de
      // "el examen necesita al menos una pregunta", ver siguiente test).
      const removeButtonsBeforeDelete = screen.getAllByRole("button", {
        name: /^Quitar Pregunta \d+$/,
      });
      await removeQuestion(user, removeButtonsBeforeDelete[0]);

      // Queda solo question-2 (ahora "Pregunta 1"): se editan su enunciado, puntos y texto de opción.
      fireEvent.change(screen.getByLabelText("Pregunta 1 - Enunciado"), {
        target: { value: "Pregunta que se mantiene (editada)" },
      });
      fireEvent.change(screen.getByLabelText("Pregunta 1 - Puntos"), { target: { value: "4" } });
      fireEvent.change(screen.getByLabelText("Pregunta 1 - Opción 1"), { target: { value: "C2" } });

      // Se agrega una pregunta nueva, sin id.
      await user.click(screen.getByRole("button", { name: "Agregar pregunta" }));
      fireEvent.change(screen.getByLabelText("Pregunta 2 - Enunciado"), {
        target: { value: "Pregunta nueva" },
      });
      fireEvent.change(screen.getByLabelText("Pregunta 2 - Opción 1"), {
        target: { value: "Sí" },
      });
      fireEvent.change(screen.getByLabelText("Pregunta 2 - Opción 2"), {
        target: { value: "No" },
      });

      await user.click(screen.getByRole("button", { name: "Guardar borrador" }));

      await waitFor(() => {
        expect(mockedPatch).toHaveBeenCalledWith("/exams/exam-1", { title: "Examen corregido" });
      });
      // question-1 se eliminó.
      expect(mockedDelete).toHaveBeenCalledWith("/questions/question-1");
      // question-2 se mantiene y sólo se reenvía lo que cambió (enunciado, puntos, texto de opción).
      expect(mockedPatch).toHaveBeenCalledWith("/questions/question-2", {
        prompt: "Pregunta que se mantiene (editada)",
        points: 4,
        optionTexts: [{ id: "opt-c", optionText: "C2" }],
      });
      // La pregunta nueva (sin id) se crea con POST, a continuación del mayor orderIndex existente.
      expect(mockedPost).toHaveBeenCalledWith("/exams/exam-1/questions", {
        type: "opcion_multiple",
        prompt: "Pregunta nueva",
        orderIndex: 3,
        points: 1,
        options: [
          { optionText: "Sí", isCorrect: true, orderIndex: 1 },
          { optionText: "No", isCorrect: false, orderIndex: 2 },
        ],
      });
    });

    it("no permite quitar la última pregunta restante", async () => {
      const user = userEvent.setup();
      render(<ExamForm courses={courses} examId="exam-1" initialValues={initialValues} />);

      const removeButtons = screen.getAllByRole("button", { name: /^Quitar Pregunta \d+$/ });
      await removeQuestion(user, removeButtons[0]);

      expect(screen.getByRole("button", { name: "Quitar Pregunta 1" })).toBeDisabled();
    });

    it("un examen publicado queda bloqueado hasta despublicarlo", async () => {
      const user = userEvent.setup();
      mockedPatch.mockResolvedValue({});
      render(
        <ExamForm
          courses={courses}
          examId="exam-1"
          initialValues={{ ...initialValues, isPublished: true }}
        />,
      );

      expect(screen.getByText("Publicado")).toBeInTheDocument();
      expect(screen.getByLabelText("Título")).toBeDisabled();
      await user.click(screen.getByRole("button", { name: "Despublicar para editar" }));

      expect(mockedPatch).toHaveBeenCalledWith("/exams/exam-1", { isPublished: false });
      await waitFor(() => expect(screen.getByLabelText("Título")).toBeEnabled());
    });

    it("con intentos registrados congela tiempo, nota y estructura; sólo admite textos", () => {
      render(
        <ExamForm courses={courses} examId="exam-1" initialValues={initialValues} hasAttempts />,
      );

      expect(screen.getByText(/Este examen ya tiene intentos/)).toBeInTheDocument();
      expect(screen.getByLabelText("Tiempo límite (minutos)")).toBeDisabled();
      expect(screen.getByLabelText("Nota mínima (%)")).toBeDisabled();
      expect(screen.getByLabelText("Pregunta 1 - Puntos")).toBeDisabled();
      expect(screen.getByRole("button", { name: "Agregar pregunta" })).toBeDisabled();
      expect(screen.getByLabelText("Pregunta 1 - Enunciado")).toBeEnabled();
    });
  });

  it("campos numéricos vacíos no se envían como 0: el envío se bloquea con mensaje en español", async () => {
    const user = userEvent.setup();
    render(<ExamForm courses={courses} />);
    fillRequiredExamFields();
    fillFirstQuestionAsMultipleChoice();
    fireEvent.change(screen.getByLabelText("Tiempo límite (minutos)"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Nota mínima (%)"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Pregunta 1 - Puntos"), { target: { value: "" } });

    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));

    expect(mockedPost).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Pregunta 1 - Puntos")).toBeRequired();
    const limit = screen.getByLabelText("Tiempo límite (minutos)") as HTMLInputElement;
    expect(limit.checkValidity()).toBe(false);
    expect(limit.validationMessage).toBe("Completa este campo.");
  });

  it("un puntaje mínimo de 0 escrito a propósito sí se envía (0 es válido)", async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue({});
    render(<ExamForm courses={courses} />);
    fillRequiredExamFields();
    fillFirstQuestionAsMultipleChoice();
    fireEvent.change(screen.getByLabelText("Nota mínima (%)"), {
      target: { value: "0" },
    });

    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));

    expect(mockedPost).toHaveBeenCalledWith(
      "/exams",
      expect.objectContaining({ passingScorePercent: 0, timeLimitMinutes: 30 }),
    );
  });
});
