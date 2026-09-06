import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExamForm, type ExamFormValues } from "@/app/(admin)/admin/exams/ExamForm";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Course } from "@/types";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

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
  fireEvent.change(screen.getByLabelText("Puntaje mínimo de aprobación (%)"), {
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

describe("ExamForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marca los campos requeridos del examen", () => {
    render(<ExamForm courses={courses} />);

    expect(screen.getByLabelText("Curso")).toBeRequired();
    expect(screen.getByLabelText("Tipo")).toBeRequired();
    expect(screen.getByLabelText("Título")).toBeRequired();
    expect(screen.getByLabelText("Tiempo límite (minutos)")).toBeRequired();
    expect(screen.getByLabelText("Puntaje mínimo de aprobación (%)")).toBeRequired();
  });

  it("arranca con una pregunta de opción múltiple con 2 opciones", () => {
    render(<ExamForm courses={courses} />);

    expect(screen.getByLabelText("Pregunta 1 - Enunciado")).toBeInTheDocument();
    expect(screen.getByLabelText("Pregunta 1 - Opción 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Pregunta 1 - Opción 2")).toBeInTheDocument();
    // Con una sola pregunta, no se puede quitar (el examen necesita al menos una).
    expect(screen.getByRole("button", { name: "Quitar pregunta" })).toBeDisabled();
  });

  it("agrega y quita preguntas dinámicamente", async () => {
    const user = userEvent.setup();
    render(<ExamForm courses={courses} />);

    await user.click(screen.getByRole("button", { name: "Agregar pregunta" }));

    expect(screen.getByLabelText("Pregunta 2 - Enunciado")).toBeInTheDocument();
    const removeButtons = screen.getAllByRole("button", { name: "Quitar pregunta" });
    expect(removeButtons[0]).not.toBeDisabled();

    await user.click(removeButtons[1]);

    expect(screen.queryByLabelText("Pregunta 2 - Enunciado")).not.toBeInTheDocument();
  });

  it("no permite quitar una opción si solo quedan 2 en una pregunta de opción múltiple", () => {
    render(<ExamForm courses={courses} />);

    const removeOptionButtons = screen.getAllByRole("button", { name: "Quitar" });
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
    mockedPost.mockResolvedValue({});
    render(<ExamForm courses={courses} />);

    fillRequiredExamFields();
    fillFirstQuestionAsMultipleChoice();

    await user.click(screen.getByRole("button", { name: "Crear examen" }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith("/exams", {
        courseId: "course-a",
        title: "Examen de práctica - Señales",
        type: "practica",
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
    expect(pushMock).toHaveBeenCalledWith("/admin/exams");
  });

  it("muestra el mensaje de error del backend si falla el guardado", async () => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValue(new ApiError("El curso indicado no existe", 404));
    render(<ExamForm courses={courses} />);

    fillRequiredExamFields();
    fillFirstQuestionAsMultipleChoice();
    await user.click(screen.getByRole("button", { name: "Crear examen" }));

    expect(await screen.findByText("El curso indicado no existe")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
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
          type: "opcion_multiple",
          prompt: "Pregunta a eliminar",
          points: "5",
          correctAnswerText: "",
          synonyms: [],
          options: [
            { optionText: "A", isCorrect: true },
            { optionText: "B", isCorrect: false },
          ],
        },
        {
          id: "question-2",
          type: "opcion_multiple",
          prompt: "Pregunta que se mantiene",
          points: "3",
          correctAnswerText: "",
          synonyms: [],
          options: [
            { optionText: "C", isCorrect: false },
            { optionText: "D", isCorrect: true },
          ],
        },
      ],
    };

    it("precarga los valores y deshabilita curso y tipo", () => {
      render(<ExamForm courses={courses} examId="exam-1" initialValues={initialValues} />);

      expect(screen.getByLabelText("Título")).toHaveValue("Examen definitivo - Señales");
      expect(screen.getByLabelText("Curso")).toBeDisabled();
      expect(screen.getByLabelText("Tipo")).toBeDisabled();
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
    });

    it("guarda metadata, quita la pregunta eliminada, edita la que se mantiene y agrega la nueva", async () => {
      const user = userEvent.setup();
      mockedPatch.mockResolvedValue({});
      mockedPost.mockResolvedValue({});
      mockedDelete.mockResolvedValue(undefined);

      render(<ExamForm courses={courses} examId="exam-1" initialValues={initialValues} />);

      // Con 2 preguntas se puede quitar la primera (question-1); con 1
      // sola pregunta el botón queda deshabilitado a propósito (regla de
      // "el examen necesita al menos una pregunta", ver siguiente test).
      const removeButtonsBeforeDelete = screen.getAllByRole("button", { name: "Quitar pregunta" });
      await user.click(removeButtonsBeforeDelete[0]);

      // Queda solo question-2 (ahora "Pregunta 1"); se agrega una nueva sin id.
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

      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      await waitFor(() => {
        expect(mockedPatch).toHaveBeenCalledWith("/exams/exam-1", {
          title: "Examen definitivo - Señales",
          timeLimitMinutes: 45,
          passingScorePercent: 80,
          isPublished: false,
        });
      });
      // question-1 se eliminó.
      expect(mockedDelete).toHaveBeenCalledWith("/questions/question-1");
      // question-2 se mantiene y se reenvía con su orderIndex recalculado (1).
      expect(mockedPatch).toHaveBeenCalledWith("/questions/question-2", {
        prompt: "Pregunta que se mantiene",
        orderIndex: 1,
        points: 3,
        options: [
          { optionText: "C", isCorrect: false, orderIndex: 1 },
          { optionText: "D", isCorrect: true, orderIndex: 2 },
        ],
      });
      // La pregunta nueva (sin id) se crea con POST, orderIndex 2.
      expect(mockedPost).toHaveBeenCalledWith("/exams/exam-1/questions", {
        type: "opcion_multiple",
        prompt: "Pregunta nueva",
        orderIndex: 2,
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

      const removeButtons = screen.getAllByRole("button", { name: "Quitar pregunta" });
      await user.click(removeButtons[0]);

      expect(screen.getByRole("button", { name: "Quitar pregunta" })).toBeDisabled();
    });
  });
});
