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
  ExamWithQuestions,
  Question,
  UpdateQuestionInput,
} from "@/types";
import {
  attemptLimitValue,
  changedExamMetadata,
  examDraftIssues,
  examTypeDefault,
} from "@/lib/utils/examAdmin";
import { useUnsavedExam } from "@/components/exams-admin/useUnsavedExam";
import { AdminChip, ContentBanner } from "@/components/content-admin/AdminContentUI";
import { Modal } from "@/components/ui/Modal";
import styles from "@/components/exams-admin/exam-admin.module.css";
import { emptyQuestion, QuestionBuilder, type QuestionFormValue } from "./QuestionBuilder";
import type { ExamFormValues } from "@/types/examDraft";
export type { ExamFormValues } from "@/types/examDraft";
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
    questions: [{ ...emptyQuestion(), draftKey: "initial" }],
    ...initialValues,
  }));
  const [cleanValues, setCleanValues] = useState(values);
  const [reordered, setReordered] = useState(false);
  const [preview, setPreview] = useState(false);
  const issues = examDraftIssues(values);
  const dirty = JSON.stringify(values) !== JSON.stringify(cleanValues);
  useUnsavedExam(dirty);
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
      if (issues.length) throw new ContentInputError(issues[0].message);
      const meta = {
        title: values.title,
        description: values.description ?? "",
        maxAttemptsDefault: attemptLimitValue(values.maxAttemptsDefault),
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
        const patch = changedExamMetadata(values, baseline, frozen);
        if (Object.keys(patch).length) {
          await api.patch(`/exams/${currentId}`, patch);
          changed = true;
        }
        const original = baseline?.questions ?? [];
        for (const old of original) {
          if (old.id && !values.questions.some((q) => q.id === old.id)) {
            await api.delete(`/questions/${old.id}`);
            changed = true;
          }
        }
        const maxOrder = Math.max(0, ...original.map((q) => q.orderIndex ?? 0));
        // The unique (exam_id, order_index) index is immediate: free the final slots first.
        if (reordered && !frozen) {
          for (const [index, q] of values.questions.entries()) {
            if (q.id && original.find((old) => old.id === q.id)?.orderIndex !== index + 1) {
              await api.patch(`/questions/${q.id}`, {
                orderIndex: maxOrder + values.questions.length + index + 1,
              });
              changed = true;
            }
          }
        }
        let order = maxOrder + 1;
        for (const [index, q] of values.questions.entries()) {
          if (!q.id) {
            await api.post<Question>(
              `/exams/${currentId}/questions`,
              questionPayload(q, reordered ? index + 1 : order++),
            );
            changed = true;
            continue;
          }
          const old = original.find((o) => o.id === q.id);
          if (!old) continue;
          const patch: UpdateQuestionInput = {};
          if (q.prompt !== old.prompt) patch.prompt = q.prompt;
          if (!frozen) {
            if (reordered && old.orderIndex !== index + 1) patch.orderIndex = index + 1;
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
          if (Object.keys(patch).length) {
            await api.patch(`/questions/${q.id}`, patch);
            changed = true;
          }
        }
      }
      if (wantsPublish) {
        await api.patch(`/exams/${currentId}`, { isPublished: true });
        setPublished(true);
        changed = true;
      }
      notify(wantsPublish ? "Examen guardado y publicado." : "Examen guardado como borrador.");
      const latest = await api.get<ExamWithQuestions>(`/exams/${currentId}`, { cache: "no-store" });
      const fresh = examToFormValues(latest);
      setValues(fresh);
      setCleanValues(fresh);
      setReordered(false);
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
          setCleanValues(fresh);
          setReordered(false);
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
  function moveQuestion(from: number, to: number) {
    const questions = [...values.questions];
    const [moved] = questions.splice(from, 1);
    questions.splice(to, 0, moved);
    field("questions", questions);
    setReordered(true);
  }
  function focusQuestion(index: number) {
    const details = document.getElementById(`exam-question-${index}`) as HTMLDetailsElement | null;
    if (details) {
      details.open = true;
      details.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    }
  }
  const points = values.questions.reduce(
    (total, question) => total + (Number(question.points) || 0),
    0,
  );
  return (
    <div className={styles.page}>
      <div className={styles.workflow}>
        <span>
          <b>1</b> Crear
        </span>
        <i>→</i>
        <span>
          <b>2</b> Publicar
        </span>
        <i>→</i>
        <span>
          <b>3</b> Colocar en una materia
        </span>
        <i>→</i>
        <span>
          <b>4</b> Habilitar
        </span>
        <Link href={id ? `/admin/content?exam=${id}` : "/admin/content"}>Ir a Contenido ↗</Link>
      </div>
      {id ? (
        <div className="flex flex-wrap items-center gap-3">
          <AdminChip tone={published ? "success" : "neutral"}>
            {published ? "Publicado" : "Borrador"}
          </AdminChip>
          {published ? (
            <Button
              variant="secondary"
              disabled={busy || reloadRequired}
              onClick={() => void publish(false)}
            >
              Despublicar para editar
            </Button>
          ) : null}
        </div>
      ) : null}
      {published ? (
        <ContentBanner>
          Para editar, despublica primero. Publicar prepara el examen; la materia y las
          habilitaciones determinan el acceso.
        </ContentBanner>
      ) : null}
      {frozen ? (
        <ContentBanner tone="warning">
          Este examen ya tiene intentos. Solo se admiten correcciones de título, descripción,
          enunciados y textos de opciones. El máximo por defecto está congelado: usa Habilitar para
          dar intentos extra. Cambiar claves, puntos, tiempo o barajado requiere otro examen.
        </ContentBanner>
      ) : null}
      <form onSubmit={submit} className={styles.editor}>
        <fieldset disabled={busy || published || reloadRequired} className={styles.mainFields}>
          <section className={styles.section} aria-labelledby="exam-general">
            <div className={styles.sectionHeading}>
              <span>01</span>
              <h2 id="exam-general">Datos generales</h2>
            </div>
            <Select
              label="Curso"
              required
              disabled={Boolean(id)}
              value={values.courseId}
              onChange={(event) => field("courseId", event.target.value)}
            >
              <option value="">Seleccionar curso</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.nombre} · Tipo {course.tipo}
                </option>
              ))}
            </Select>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-text-secondary">Tipo</legend>
              <div className={styles.typeCards}>
                {(["practica", "definitivo"] as const).map((type) => (
                  <label key={type}>
                    <input
                      type="radio"
                      name="exam-type"
                      value={type}
                      required
                      checked={values.type === type}
                      disabled={Boolean(id)}
                      onChange={() =>
                        setValues((current) => ({
                          ...current,
                          type,
                          maxAttemptsDefault: examTypeDefault(type),
                        }))
                      }
                    />
                    <strong>{type === "practica" ? "Práctica" : "Definitivo"}</strong>
                    <small>
                      {type === "practica"
                        ? "Para practicar y reforzar conocimientos. Intentos ilimitados por defecto."
                        : "Evaluación final. Un definitivo aprobado nunca se repite."}
                    </small>
                  </label>
                ))}
              </div>
            </fieldset>
            <Input
              label="Título"
              required
              value={values.title}
              onChange={(event) => field("title", event.target.value)}
            />
            <Textarea
              label="Descripción"
              maxLength={20000}
              value={values.description ?? ""}
              onChange={(event) => field("description", event.target.value)}
            />
          </section>
          <section className={styles.section} aria-labelledby="exam-rules">
            <div className={styles.sectionHeading}>
              <span>02</span>
              <h2 id="exam-rules">Reglas del examen</h2>
            </div>
            <p className={styles.help}>
              Valores base para nuevas evaluaciones. La regla del alumno reemplaza a la de su
              cohorte; un intento iniciado conserva su configuración.
            </p>
            <div className={styles.twoColumns}>
              <div>
                <Input
                  label="Tiempo límite (minutos)"
                  type="number"
                  min={1}
                  step={1}
                  required
                  disabled={frozen}
                  value={values.timeLimitMinutes}
                  aria-describedby="exam-time-help"
                  onChange={(event) => field("timeLimitMinutes", event.target.value)}
                />
                <p id="exam-time-help" className={styles.help}>
                  Los minutos extra se suman desde la habilitación
                </p>
              </div>
              <div>
                <Input
                  label="Nota mínima (%)"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  required
                  disabled={frozen}
                  value={values.passingScorePercent}
                  onChange={(event) => field("passingScorePercent", event.target.value)}
                />
                <meter
                  aria-label="Nota para aprobar"
                  min={0}
                  max={100}
                  value={Number(values.passingScorePercent) || 0}
                  className={styles.passingMeter}
                />
              </div>
            </div>
            <div>
              <Input
                label="Intentos por defecto (vacío = ilimitados)"
                type="number"
                min={1}
                max={20}
                step={1}
                disabled={frozen}
                value={values.maxAttemptsDefault ?? ""}
                aria-describedby="exam-attempt-help"
                onChange={(event) => field("maxAttemptsDefault", event.target.value)}
              />
              <p id="exam-attempt-help" className={styles.help}>
                Se usa si la habilitación no define un límite propio. Vacío = ilimitado.
              </p>
            </div>
            {values.type === "definitivo" &&
            attemptLimitValue(values.maxAttemptsDefault) === null ? (
              <ContentBanner tone="warning">
                Este definitivo permitirá intentos ilimitados hasta aprobar si la habilitación no
                define un límite propio. Un definitivo aprobado nunca se repite.
              </ContentBanner>
            ) : null}
            <div className={styles.switches}>
              <label>
                <span>
                  Barajar preguntas<small>Cambia el orden de las preguntas en cada intento.</small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Barajar preguntas"
                  disabled={frozen}
                  checked={values.shuffleQuestions ?? false}
                  onChange={(event) => field("shuffleQuestions", event.target.checked)}
                />
              </label>
              <label>
                <span>
                  Barajar opciones<small>Cambia el orden de las opciones al responder.</small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Barajar opciones"
                  disabled={frozen}
                  checked={values.shuffleOptions ?? false}
                  onChange={(event) => field("shuffleOptions", event.target.checked)}
                />
              </label>
            </div>
          </section>
          <section className={styles.section} aria-labelledby="exam-bank">
            <div className={styles.sectionHeading}>
              <span>03</span>
              <h2 id="exam-bank">Preguntas</h2>
              <span className="ml-auto">{values.questions.length}</span>
            </div>
            <p className={styles.help}>
              Completa cada enunciado. En opción múltiple, marca exactamente una respuesta correcta.
            </p>
            {values.questions.map((question, index) => (
              <QuestionBuilder
                key={question.id ?? question.draftKey ?? index}
                question={question}
                index={index}
                textOnly={frozen}
                canRemove={values.questions.length > 1}
                canMoveUp={index > 0}
                canMoveDown={index < values.questions.length - 1}
                onMoveUp={() => moveQuestion(index, index - 1)}
                onMoveDown={() => moveQuestion(index, index + 1)}
                onDuplicate={() => {
                  const copy: QuestionFormValue = {
                    ...question,
                    id: undefined,
                    orderIndex: undefined,
                    draftKey: crypto.randomUUID(),
                    synonyms: [...question.synonyms],
                    options: question.options.map((option) => ({
                      optionText: option.optionText,
                      isCorrect: option.isCorrect,
                    })),
                  };
                  const questions = [...values.questions];
                  questions.splice(index + 1, 0, copy);
                  field("questions", questions);
                  setReordered(true);
                }}
                issues={issues
                  .filter((issue) => issue.questionIndex === index)
                  .map((issue) => issue.message)}
                onChange={(updated) =>
                  field(
                    "questions",
                    values.questions.map((old, position) => (position === index ? updated : old)),
                  )
                }
                onRemove={() => setRemoved(index)}
              />
            ))}
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
          </section>
          <div className={styles.actions}>
            <span>{dirty ? "Cambios sin guardar" : "Sin cambios pendientes"}</span>
            <Button type="submit" variant="secondary" isLoading={busy}>
              Guardar borrador
            </Button>
            <Button type="submit" disabled={busy} data-publish="true">
              Guardar y publicar
            </Button>
          </div>
          <FormError>{error}</FormError>
        </fieldset>
        <aside className={styles.summary} aria-label="Resumen en vivo">
          <div className="flex items-center justify-between gap-2">
            <h2>Resumen del examen</h2>
            <span className={styles.help}>En vivo</span>
          </div>
          <div className={styles.summaryStats}>
            <div>
              <span>Preguntas</span>
              <strong>{values.questions.length}</strong>
            </div>
            <div>
              <span>Puntos totales</span>
              <strong>{points.toLocaleString("es-EC")}</strong>
            </div>
            <div>
              <span>Tiempo</span>
              <strong>{values.timeLimitMinutes || "—"} min</strong>
            </div>
            <div>
              <span>Para aprobar</span>
              <strong>{values.passingScorePercent || "—"}%</strong>
            </div>
            <div>
              <span>Intentos</span>
              <strong>{values.maxAttemptsDefault || "∞"}</strong>
            </div>
          </div>
          <div className={styles.issues}>
            <strong>
              {issues.length
                ? `${issues.length} validaciones pendientes`
                : "✓ Listo para guardar y publicar"}
            </strong>
            <ul>
              {issues.map((issue, index) => (
                <li key={index}>
                  {issue.questionIndex === undefined ? (
                    issue.message
                  ) : (
                    <button type="button" onClick={() => focusQuestion(issue.questionIndex!)}>
                      {issue.message}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <Button type="button" variant="secondary" onClick={() => setPreview(true)}>
            Vista previa del alumno
          </Button>
          <p className={styles.help}>
            Publicarlo no habilita el acceso. Continúa en Contenido para colocarlo y habilitarlo.
          </p>
        </aside>
      </form>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link className="underline" href="/admin/exams">
          Volver a exámenes
        </Link>
        <Link className="underline" href={id ? `/admin/content?exam=${id}` : "/admin/content"}>
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
              values.questions.filter((_, index) => index !== removed),
            );
            setRemoved(null);
          }}
        />
      ) : null}
      <Modal
        isOpen={preview}
        onClose={() => setPreview(false)}
        title="Vista previa del alumno"
        className={styles.preview}
      >
        <p className={styles.help}>
          Simulación visual del banco. El orden puede variar al barajar. No muestra claves ni
          respuestas correctas.
        </p>
        <h2 className="my-4 text-xl font-semibold">{values.title || "Sin título"}</h2>
        {values.questions.map((question, index) => (
          <div key={index} className={styles.previewQuestion}>
            <h3>
              {index + 1}. {question.prompt || "Enunciado pendiente"}
            </h3>
            {question.type === "opcion_multiple" ? (
              question.options.map((option, optionIndex) => (
                <label key={optionIndex}>
                  <input type="radio" name={`preview-${index}`} />
                  {option.optionText || `Opción ${optionIndex + 1}`}
                </label>
              ))
            ) : (
              <Textarea label={`Respuesta ${index + 1}`} placeholder="Escribe tu respuesta" />
            )}
          </div>
        ))}
      </Modal>
    </div>
  );
}
