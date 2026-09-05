"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, Input, Select } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Course, CreateQuestionInput, ExamType, UpdateQuestionInput } from "@/types";

import { emptyQuestion, QuestionBuilder, type QuestionFormValue } from "./QuestionBuilder";

export interface ExamFormValues {
  courseId: string;
  title: string;
  type: ExamType;
  timeLimitMinutes: string;
  passingScorePercent: string;
  isPublished: boolean;
  questions: QuestionFormValue[];
}

const EMPTY_VALUES: ExamFormValues = {
  courseId: "",
  title: "",
  type: "practica",
  timeLimitMinutes: "",
  passingScorePercent: "",
  isPublished: false,
  questions: [emptyQuestion()],
};

interface ExamFormProps {
  courses: Course[];
  /** Presente => modo edición (PATCH + diff de preguntas). Ausente => creación (POST). */
  examId?: string;
  initialValues?: ExamFormValues;
}

function buildQuestionPayload(
  question: QuestionFormValue,
  orderIndex: number,
): CreateQuestionInput {
  if (question.type === "opcion_multiple") {
    return {
      type: "opcion_multiple",
      prompt: question.prompt,
      orderIndex,
      points: Number(question.points),
      options: question.options.map((option, optionIndex) => ({
        optionText: option.optionText,
        isCorrect: option.isCorrect,
        orderIndex: optionIndex + 1,
      })),
    };
  }

  return {
    type: "texto_abierto",
    prompt: question.prompt,
    orderIndex,
    points: Number(question.points),
    correctAnswerText: question.correctAnswerText,
    synonyms: question.synonyms.map((s) => s.trim()).filter((s) => s !== ""),
  };
}

// PATCH /questions/:id no admite cambiar el tipo (el backend lo rechaza:
// dejaría correct_answer_text/options inconsistentes con la constraint
// questions_open_text_has_answer), así que se arma aparte en vez de
// reutilizar buildQuestionPayload quitándole el campo.
function buildQuestionUpdatePayload(
  question: QuestionFormValue,
  orderIndex: number,
): UpdateQuestionInput {
  if (question.type === "opcion_multiple") {
    return {
      prompt: question.prompt,
      orderIndex,
      points: Number(question.points),
      options: question.options.map((option, optionIndex) => ({
        optionText: option.optionText,
        isCorrect: option.isCorrect,
        orderIndex: optionIndex + 1,
      })),
    };
  }

  return {
    prompt: question.prompt,
    orderIndex,
    points: Number(question.points),
    correctAnswerText: question.correctAnswerText,
    synonyms: question.synonyms.map((s) => s.trim()).filter((s) => s !== ""),
  };
}

export function ExamForm({ courses, examId, initialValues }: ExamFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(examId);
  const [values, setValues] = useState<ExamFormValues>(initialValues ?? EMPTY_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof ExamFormValues>(field: K, value: ExamFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function updateQuestion(index: number, question: QuestionFormValue) {
    setValues((current) => ({
      ...current,
      questions: current.questions.map((q, i) => (i === index ? question : q)),
    }));
  }

  function addQuestion() {
    setValues((current) => ({ ...current, questions: [...current.questions, emptyQuestion()] }));
  }

  function removeQuestion(index: number) {
    setValues((current) => ({
      ...current,
      questions: current.questions.filter((_, i) => i !== index),
    }));
  }

  async function createExam() {
    await api.post("/exams", {
      courseId: values.courseId,
      title: values.title,
      type: values.type,
      timeLimitMinutes: Number(values.timeLimitMinutes),
      passingScorePercent: Number(values.passingScorePercent),
      questions: values.questions.map((question, index) =>
        buildQuestionPayload(question, index + 1),
      ),
    });
  }

  // No existe un endpoint "reemplazar todas las preguntas": se guarda el
  // examen (PATCH) y luego se aplica el diff de preguntas por id contra
  // lo que había al cargar el formulario - nuevas (sin id) -> POST,
  // existentes -> PATCH, quitadas -> DELETE. Todo en paralelo: son
  // recursos independientes, no hay orden que respetar entre ellos.
  async function saveEdits() {
    await api.patch(`/exams/${examId}`, {
      title: values.title,
      timeLimitMinutes: Number(values.timeLimitMinutes),
      passingScorePercent: Number(values.passingScorePercent),
      isPublished: values.isPublished,
    });

    const originalIds = new Set(
      (initialValues?.questions ?? []).map((q) => q.id).filter((id): id is string => Boolean(id)),
    );
    const currentIds = new Set(
      values.questions.map((q) => q.id).filter((id): id is string => Boolean(id)),
    );
    const toDelete = [...originalIds].filter((id) => !currentIds.has(id));

    const requests: Promise<unknown>[] = toDelete.map((id) => api.delete(`/questions/${id}`));

    values.questions.forEach((question, index) => {
      const orderIndex = index + 1;
      if (question.id) {
        requests.push(
          api.patch(`/questions/${question.id}`, buildQuestionUpdatePayload(question, orderIndex)),
        );
      } else {
        requests.push(
          api.post(`/exams/${examId}/questions`, buildQuestionPayload(question, orderIndex)),
        );
      }
    });

    await Promise.all(requests);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (examId) {
        await saveEdits();
      } else {
        await createExam();
      }
      router.push("/admin/exams");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el examen.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Curso"
            name="courseId"
            required
            disabled={isEditMode}
            value={values.courseId}
            onChange={(event) => updateField("courseId", event.target.value)}
          >
            <option value="" disabled>
              Selecciona un curso
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.nombre} (Tipo {course.tipo})
              </option>
            ))}
          </Select>
          <Select
            label="Tipo"
            name="type"
            required
            disabled={isEditMode}
            value={values.type}
            onChange={(event) => updateField("type", event.target.value as ExamType)}
          >
            <option value="practica">Práctica (intentos ilimitados)</option>
            <option value="definitivo">Definitivo (1 solo intento)</option>
          </Select>
        </div>
        {isEditMode ? (
          <p className="text-sm text-text-secondary">
            El curso y el tipo no se pueden cambiar después de creado el examen.
          </p>
        ) : null}

        <Input
          label="Título"
          name="title"
          required
          value={values.title}
          onChange={(event) => updateField("title", event.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Tiempo límite (minutos)"
            name="timeLimitMinutes"
            type="number"
            min="1"
            step="1"
            required
            value={values.timeLimitMinutes}
            onChange={(event) => updateField("timeLimitMinutes", event.target.value)}
          />
          <Input
            label="Puntaje mínimo de aprobación (%)"
            name="passingScorePercent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            required
            value={values.passingScorePercent}
            onChange={(event) => updateField("passingScorePercent", event.target.value)}
          />
        </div>

        {isEditMode ? (
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={values.isPublished}
              onChange={(event) => updateField("isPublished", event.target.checked)}
              className="h-4 w-4 accent-accent-red"
            />
            Publicado (visible para los estudiantes del curso)
          </label>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text-primary">Preguntas</h2>
          <Button type="button" variant="secondary" size="sm" onClick={addQuestion}>
            Agregar pregunta
          </Button>
        </div>

        {values.questions.map((question, index) => (
          <QuestionBuilder
            key={index}
            question={question}
            index={index}
            canRemove={values.questions.length > 1}
            onChange={(updated) => updateQuestion(index, updated)}
            onRemove={() => removeQuestion(index)}
          />
        ))}
      </div>

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      <Button type="submit" isLoading={isSubmitting}>
        {isEditMode ? "Guardar cambios" : "Crear examen"}
      </Button>
    </form>
  );
}
