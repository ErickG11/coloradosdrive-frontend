"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Button, FormError, Input, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import { contentErrorMessage, ContentInputError } from "@/lib/utils/content";
import { useContentSuccess } from "@/components/content-admin/ContentFeedback";
import { ContentConfirm } from "@/components/content-admin/ContentUI";
import type {
  Course,
  CreateQuestionInput,
  ExamType,
  ExamWithQuestions,
  Question,
  UpdateExamInput,
  UpdateQuestionInput,
} from "@/types";
import { emptyQuestion, QuestionBuilder, type QuestionFormValue } from "./QuestionBuilder";
export interface ExamFormValues {
  courseId: string;
  title: string;
  type: ExamType;
  timeLimitMinutes: string;
  passingScorePercent: string;
  isPublished: boolean;
  questions: QuestionFormValue[];
  description?: string;
  maxAttemptsDefault?: string;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}
export function examToFormValues(exam: ExamWithQuestions): ExamFormValues {
  return {
    courseId: exam.courseId,
    title: exam.title,
    type: exam.type,
    timeLimitMinutes: String(exam.timeLimitMinutes),
    passingScorePercent: String(exam.passingScorePercent),
    isPublished: exam.isPublished,
    description: exam.description ?? "",
    maxAttemptsDefault:
      exam.maxAttemptsDefault === null
        ? ""
        : String(exam.maxAttemptsDefault ?? (exam.type === "definitivo" ? 1 : "")),
    shuffleQuestions: exam.shuffleQuestions ?? false,
    shuffleOptions: exam.shuffleOptions ?? false,
    questions: exam.questions
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((q) => ({
        id: q.id,
        orderIndex: q.orderIndex,
        type: q.type,
        prompt: q.prompt,
        points: String(q.points),
        correctAnswerText: q.correctAnswerText ?? "",
        synonyms: q.synonyms ?? [],
        options: q.options
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((o) => ({ id: o.id, optionText: o.optionText, isCorrect: o.isCorrect })),
      })),
  };
}
function questionPayload(question: QuestionFormValue, orderIndex: number): CreateQuestionInput {
  return {
    type: question.type,
    prompt: question.prompt,
    points: Number(question.points),
    orderIndex,
    ...(question.type === "opcion_multiple"
      ? {
          options: question.options.map((o, i) => ({
            optionText: o.optionText,
            isCorrect: o.isCorrect,
            orderIndex: i + 1,
          })),
        }
      : {
          correctAnswerText: question.correctAnswerText,
          synonyms: question.synonyms.map((s) => s.trim()).filter(Boolean),
        }),
  };
}
export function ExamForm({
  courses,
  examId,
  initialValues,
  hasAttempts = false,
}: {
  courses: Course[];
  examId?: string;
  initialValues?: ExamFormValues;
  hasAttempts?: boolean;
}) {
  const [values, setValues] = useState<ExamFormValues>(() => ({
    courseId: "",
    title: "",
    type: "practica",
    timeLimitMinutes: "",
    passingScorePercent: "70",
    isPublished: false,
    description: "",
    maxAttemptsDefault: "",
    shuffleQuestions: false,
    shuffleOptions: false,
    questions: [emptyQuestion()],
    ...initialValues,
  }));
  const [baseline, setBaseline] = useState(initialValues);
  const [id, setId] = useState(examId ?? "");
  const [published, setPublished] = useState(initialValues?.isPublished ?? false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<number | null>(null);
  const [frozen, setFrozen] = useState(hasAttempts);
  const [reloadRequired, setReloadRequired] = useState(false);
  const notify = useContentSuccess();
  function field<K extends keyof ExamFormValues>(key: K, value: ExamFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }
  async function publish(value: boolean) {
    if (lock.current || !id) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/exams/${id}`, { isPublished: value });
      setPublished(value);
      notify(value ? "Examen publicado." : "Examen despublicado. Puedes editarlo.");
    } catch (error: unknown) {
      setError(contentErrorMessage(error));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || published || reloadRequired) return;
    const wantsPublish =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute("data-publish") === "true";
    lock.current = true;
    setBusy(true);
    setError(null);
    let changed = false;
    let currentId = id;
    try {
      if (
        !values.questions.length ||
        values.questions.some(
          (q) =>
            !q.prompt.trim() ||
            (q.type === "opcion_multiple" &&
              (q.options.length < 2 ||
                q.options.filter((o) => o.isCorrect).length !== 1 ||
                q.options.some((o) => !o.optionText.trim()))),
        )
      )
        throw new ContentInputError(
          "El banco necesita preguntas completas y exactamente una opción correcta por pregunta múltiple.",
        );
      const meta = {
        title: values.title,
        description: values.description ?? "",
        maxAttemptsDefault:
          values.maxAttemptsDefault === "" ? null : Number(values.maxAttemptsDefault),
        shuffleQuestions: values.shuffleQuestions ?? false,
        shuffleOptions: values.shuffleOptions ?? false,
        timeLimitMinutes: Number(values.timeLimitMinutes),
        passingScorePercent: Number(values.passingScorePercent),
      };
      if (!currentId) {
        const created = await api.post<ExamWithQuestions>("/exams", {
          ...meta,
          courseId: values.courseId,
          type: values.type,
          questions: values.questions.map((q, i) => questionPayload(q, i + 1)),
        });
        currentId = created.id;
        setId(currentId);
        changed = true;
      } else {
        const patch: UpdateExamInput = { title: meta.title, description: meta.description };
        if (!frozen) Object.assign(patch, meta);
        await api.patch(`/exams/${currentId}`, patch);
        changed = true;
        const original = baseline?.questions ?? [];
        for (const old of original)
          if (old.id && !values.questions.some((q) => q.id === old.id))
            await api.delete(`/questions/${old.id}`);
        let order = Math.max(0, ...original.map((q) => q.orderIndex ?? 0)) + 1;
        for (const q of values.questions) {
          if (!q.id) {
            await api.post<Question>(`/exams/${currentId}/questions`, questionPayload(q, order++));
            continue;
          }
          const old = original.find((o) => o.id === q.id);
          if (!old) continue;
          const patch: UpdateQuestionInput = {};
          if (q.prompt !== old.prompt) patch.prompt = q.prompt;
          if (!frozen) {
            if (q.points !== old.points) patch.points = Number(q.points);
            if (q.correctAnswerText !== old.correctAnswerText)
              patch.correctAnswerText = q.correctAnswerText;
            if (JSON.stringify(q.synonyms) !== JSON.stringify(old.synonyms))
              patch.synonyms = q.synonyms.map((s) => s.trim()).filter(Boolean);
          }
          if (q.type === "opcion_multiple") {
            const structural =
              q.options.length !== old.options.length ||
              q.options.some(
                (o, i) => o.id !== old.options[i]?.id || o.isCorrect !== old.options[i]?.isCorrect,
              );
            if (structural && !frozen)
              patch.options = questionPayload(q, q.orderIndex ?? 1).options;
            else {
              const texts = q.options
                .filter((o, i) => o.optionText !== old.options[i]?.optionText)
                .map((o) => ({ id: o.id ?? "", optionText: o.optionText }));
              if (texts.length) patch.optionTexts = texts;
            }
          }
          if (Object.keys(patch).length) await api.patch(`/questions/${q.id}`, patch);
        }
      }
      if (wantsPublish) {
        await api.patch(`/exams/${currentId}`, { isPublished: true });
        setPublished(true);
      }
      notify(wantsPublish ? "Examen guardado y publicado." : "Examen guardado como borrador.");
      const latest = await api.get<ExamWithQuestions>(`/exams/${currentId}`, { cache: "no-store" });
      const fresh = examToFormValues(latest);
      setValues(fresh);
      setBaseline(fresh);
      setPublished(latest.isPublished);
    } catch (error: unknown) {
      setError(contentErrorMessage(error));
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "EXAM_STRUCTURE_FROZEN"
      )
        setFrozen(true);
      const structureConflict =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "EXAM_STRUCTURE_FROZEN";
      if (changed || structureConflict) {
        if (changed)
          notify("Se guardaron cambios parciales del examen. Revisa el error antes de continuar.");
        try {
          const latest = await api.get<ExamWithQuestions>(`/exams/${currentId}`, {
            cache: "no-store",
          });
          const fresh = examToFormValues(latest);
          setValues(fresh);
          setBaseline(fresh);
          setPublished(latest.isPublished);
        } catch {
          setReloadRequired(true);
          setError(
            "Se guardaron cambios parciales, pero no se pudo recuperar el examen. Recarga la página antes de repetir para no duplicar preguntas.",
          );
        }
      }
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        Flujo: despublicar → editar → publicar. Publicar prepara el examen; las habilitaciones y la
        materia determinan el acceso.
      </p>
      {id ? (
        <div className="flex flex-wrap items-center gap-3">
          <strong>{published ? "Publicado" : "Borrador"}</strong>
          {published ? (
            <Button disabled={busy || reloadRequired} onClick={() => void publish(false)}>
              Despublicar para editar
            </Button>
          ) : null}
        </div>
      ) : null}
      {frozen ? (
        <p className="rounded-md border border-status-warning p-4 text-sm">
          Este examen ya tiene intentos. Solo se admiten correcciones de texto y despublicación. El
          máximo por defecto está congelado: usa Habilitar para dar intentos extra. Cambiar claves,
          puntos, tiempo o barajado requiere otro examen.
        </p>
      ) : null}
      <form className="space-y-6" onSubmit={submit}>
        <fieldset disabled={busy || published || reloadRequired} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Curso"
              required
              disabled={Boolean(id)}
              value={values.courseId}
              onChange={(e) => field("courseId", e.target.value)}
            >
              <option value="">Seleccionar curso</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} · Tipo {c.tipo}
                </option>
              ))}
            </Select>
            <Select
              label="Tipo"
              name="type"
              required
              value={values.type}
              disabled={Boolean(id)}
              onChange={(e) =>
                setValues({
                  ...values,
                  type: e.target.value as ExamType,
                  maxAttemptsDefault: e.target.value === "definitivo" ? "1" : "",
                })
              }
            >
              <option value="practica">Práctica</option>
              <option value="definitivo">Definitivo</option>
            </Select>
          </div>
          <Input
            label="Título"
            required
            value={values.title}
            onChange={(e) => field("title", e.target.value)}
          />
          <Textarea
            label="Descripción"
            maxLength={20000}
            value={values.description ?? ""}
            onChange={(e) => field("description", e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Tiempo límite (minutos)"
              type="number"
              min={1}
              step={1}
              required
              disabled={frozen}
              value={values.timeLimitMinutes}
              onChange={(e) => field("timeLimitMinutes", e.target.value)}
            />
            <Input
              label="Nota mínima (%)"
              type="number"
              min={0}
              max={100}
              step="0.01"
              required
              disabled={frozen}
              value={values.passingScorePercent}
              onChange={(e) => field("passingScorePercent", e.target.value)}
            />
            <Input
              label="Intentos por defecto (vacío = ilimitados)"
              type="number"
              min={1}
              max={20}
              step={1}
              disabled={frozen}
              value={values.maxAttemptsDefault ?? ""}
              onChange={(e) => field("maxAttemptsDefault", e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-5">
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                disabled={frozen}
                checked={values.shuffleQuestions ?? false}
                onChange={(e) => field("shuffleQuestions", e.target.checked)}
              />
              Barajar preguntas
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                disabled={frozen}
                checked={values.shuffleOptions ?? false}
                onChange={(e) => field("shuffleOptions", e.target.checked)}
              />
              Barajar opciones
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Preguntas</h2>
            <Button
              type="button"
              variant="secondary"
              disabled={frozen}
              onClick={() =>
                field("questions", [
                  ...values.questions,
                  { ...emptyQuestion(), draftKey: crypto.randomUUID() },
                ])
              }
            >
              Agregar pregunta
            </Button>
          </div>
          {values.questions.map((q, index) => (
            <QuestionBuilder
              key={q.id ?? q.draftKey ?? index}
              question={q}
              index={index}
              textOnly={frozen}
              canRemove={values.questions.length > 1}
              onChange={(updated) =>
                field(
                  "questions",
                  values.questions.map((old, i) => (i === index ? updated : old)),
                )
              }
              onRemove={() => setRemoved(index)}
            />
          ))}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" isLoading={busy}>
              Guardar borrador
            </Button>
            <Button type="submit" variant="secondary" disabled={busy} data-publish="true">
              Guardar y publicar
            </Button>
          </div>
        </fieldset>
        <FormError>{error}</FormError>
      </form>
      <div className="flex flex-wrap gap-4">
        <Link className="underline" href="/admin/exams">
          Volver a exámenes
        </Link>
        <Link className="underline" href="/admin/content">
          Ir a Contenido y habilitaciones
        </Link>
      </div>
      {removed !== null ? (
        <ContentConfirm
          title="Quitar pregunta del banco"
          description="La pregunta se quitará al guardar. El servidor impedirá borrarla si el examen tiene intentos."
          busy={false}
          error={null}
          onClose={() => setRemoved(null)}
          onConfirm={() => {
            field(
              "questions",
              values.questions.filter((_, i) => i !== removed),
            );
            setRemoved(null);
          }}
        />
      ) : null}
    </div>
  );
}
