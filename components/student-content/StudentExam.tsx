"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { QuestionImage } from "@/components/exams/QuestionImage";
import { questionImageApi } from "@/lib/api/questionImages";
import type { QuestionImage as ImageValue, AttemptQuestionImage } from "@/types/exam";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { ownCatalog, ownExamContext } from "@/lib/api/studentContent";
import { contentDate } from "@/lib/utils/content";
import {
  accessLabel,
  countdown,
  remainingTime,
  serverTime,
  shouldAutoSend,
  studentContentError,
  timeWarning,
  type ServerClock,
} from "@/lib/utils/studentContent";
import { Button } from "@/components/ui/Button";
import { buttonClassName } from "@/components/ui/buttonStyles";
import { useContentSuccess } from "@/components/content-admin/ContentFeedback";
import type { AttemptResult, ExamAttempt, SubmitAnswerInput } from "@/types/examAttempt";
import type { ActiveStudentAttempt } from "@/types/studentContent";
import { StudentError, StudentLoading } from "./StudentContentUI";
import { Modal } from "@/components/ui/Modal";
import { LearningIcon, ScoreRing } from "./CourseVisuals";
import styles from "./student-learning.module.css";

type Context = Awaited<ReturnType<typeof ownExamContext>>;
type Result = AttemptResult | ExamAttempt;
type Images = Record<string, ImageValue | null>;
const draftKey = (id: string) => `content-attempt:${id}`;
function clearDraft(id: string) {
  try {
    sessionStorage.removeItem(draftKey(id));
  } catch {
    /* Storage may be disabled. */
  }
}

export function StudentExam({ examId, courseId }: { examId: string; courseId: string | null }) {
  const [revision, setRevision] = useState(0);
  const [loadedRevision, setLoadedRevision] = useState(-1);
  const [context, setContext] = useState<Context | null>(null);
  const [history, setHistory] = useState<ExamAttempt[] | null>(null);
  const [active, setActive] = useState<ActiveStudentAttempt | null>(null);
  const [resultImages, setResultImages] = useState<Images>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<"practica" | "definitivo" | null>(null);
  const [denied, setDenied] = useState(false);
  const lock = useRef(false);
  const notify = useContentSuccess();
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      ownExamContext(examId, courseId, controller.signal),
      api.get<ExamAttempt[]>(`/exams/${examId}/attempts/me`, {
        signal: controller.signal,
        cache: "no-store",
      }),
    ])
      .then(([value, attempts]) => {
        if (controller.signal.aborted) return;
        setContext(value);
        setHistory(attempts);
        setLoadedRevision(revision);
        if (revision === 0) setError(null);
        for (const attempt of attempts) if (attempt.status === "completado") clearDraft(attempt.id);
        const latest = attempts.toSorted(
          (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
        )[0];
        if (!value.item.intento_en_progreso && latest?.status === "completado")
          setResult((previous) => {
            const previousId =
              previous && ("attemptId" in previous ? previous.attemptId : previous.id);
            return previousId === latest.id ? previous : latest;
          });
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(studentContentError(failure));
      });
    return () => controller.abort();
  }, [examId, courseId, revision]);

  async function start() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const fresh = await ownExamContext(examId, context?.catalog.course_id ?? courseId);
      setContext(fresh);
      // Check a known attempt's final state before asking the server to resume it.
      const expected = context?.item.intento_en_progreso;
      if (expected) {
        const state = await api.get<ExamAttempt>(`/attempts/${expected.id}`, { cache: "no-store" });
        if (
          state.status === "completado" ||
          remainingTime(expected.deadline_at, fresh.clock, performance.now()) === 0
        ) {
          clearDraft(expected.id);
          setResult(state);
          setRevision((value) => value + 1);
          setError("El intento anterior terminó. Revisa el resultado antes de iniciar otro.");
          return;
        }
      }
      const started = await api.post<ActiveStudentAttempt>(`/exams/${examId}/attempts`);
      if (!Number.isFinite(Date.parse(started.deadlineAt))) throw new Error("Missing deadline");
      setType(started.exam.type);
      setResult(null);
      setResultImages({});
      setActive(started);
      notify(
        expected && expected.id === started.attemptId ? "Intento reanudado." : "Intento iniciado.",
      );
    } catch (failure) {
      setError(studentContentError(failure));
      if (
        failure instanceof ApiError &&
        ["ATTEMPTS_EXHAUSTED", "ALREADY_PASSED"].includes(failure.code ?? "")
      )
        setDenied(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const finish = useCallback((value: Result, notice?: string, images: Images = {}) => {
    setResultImages(images);
    setActive(null);
    setResult(value);
    setError(notice ?? null);
    setRevision((previous) => previous + 1);
  }, []);
  const back = context
    ? `/student/course?course_id=${encodeURIComponent(context.catalog.course_id)}`
    : "/student/course";
  if (!context || !history)
    return (
      <div className="space-y-4">
        <Link href={back} className={buttonClassName("ghost")}>
          ← Volver al curso
        </Link>
        {error ? (
          <StudentError error={error} retry={() => setRevision((value) => value + 1)} />
        ) : (
          <StudentLoading />
        )}
      </div>
    );
  if (active)
    return (
      <AttemptForm
        key={active.attemptId}
        attempt={active}
        clock={context.clock}
        courseId={context.catalog.course_id}
        finish={finish}
        back={back}
      />
    );
  const item = context.item;
  const resultId = result && ("attemptId" in result ? result.attemptId : result.id);
  const ongoing = item.intento_en_progreso?.id === resultId ? null : item.intento_en_progreso;
  const left =
    item.intentos_permitidos == null || (item.intentos_usados ?? 0) < item.intentos_permitidos;
  const passedDefinitive = type === "definitivo" && (item.completado || result?.passed === true);
  const refreshing = loadedRevision !== revision;
  const allowed =
    !refreshing &&
    !denied &&
    (Boolean(ongoing) || (item.access.estado === "abierto" && left && !passedDefinitive));
  return (
    <div className={`${styles.examPage} space-y-5`}>
      <Link href={back} className={buttonClassName("ghost")}>
        ← Volver al curso
      </Link>
      <section className={styles.examIntro}>
        <span className={styles.courseTag}>
          <LearningIcon name="examen" />
          Examen del curso
        </span>
        <h1>{item.title}</h1>
        {item.description ? (
          <p className="whitespace-pre-wrap break-words text-sm text-text-secondary">
            {item.description}
          </p>
        ) : null}
        <p className="text-sm text-text-secondary">{accessLabel(item.access)}</p>
        <p className="text-sm">
          Intentos usados: {item.intentos_usados ?? 0} / {item.intentos_permitidos ?? "∞"}
          {item.mejor_nota != null ? ` · Mejor nota: ${item.mejor_nota}%` : ""}
        </p>
        {ongoing ? (
          <p className="text-sm">
            Intento en curso. Límite: {contentDate(ongoing.deadline_at)}. Cerrar esta ventana no
            detiene el tiempo.
          </p>
        ) : null}
        {result ? (
          <ExamResult result={result} images={resultImages} />
        ) : (
          <p className={styles.introNote}>
            Cuando inicies, el tiempo seguirá corriendo aunque cierres la ventana. Tus respuestas se
            guardan temporalmente en esta pestaña. Se enviarán automáticamente unos 10 segundos
            antes del límite; también puedes enviarlas cuando termines.
          </p>
        )}
        {error ? (
          <StudentError
            error={error}
            retry={() => {
              setError(null);
              setDenied(false);
              setRevision((value) => value + 1);
            }}
          />
        ) : null}
        {allowed ? (
          <Button isLoading={busy} onClick={() => void start()}>
            {ongoing
              ? "Continuar intento"
              : !result
                ? "Iniciar examen"
                : item.completado && !type
                  ? "Comprobar nuevo intento"
                  : "Intentar de nuevo"}
          </Button>
        ) : (
          <p className="text-sm text-text-secondary">
            {refreshing
              ? "Actualizando disponibilidad de intentos…"
              : passedDefinitive
                ? "Ya aprobaste este definitivo y no se puede repetir."
                : denied || !left
                  ? "No hay más intentos disponibles por ahora."
                  : "No puedes iniciar un intento mientras el examen no esté abierto."}
          </p>
        )}
        {item.completado && !type && allowed && !ongoing ? (
          <p className="text-xs text-text-secondary">
            El servidor comprobará si puedes repetirlo. Un definitivo aprobado nunca se vuelve a
            iniciar.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ExamResult({ result, images }: { result: Result; images: Images }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section
      aria-label="Resultado del examen"
      className={styles.result}
      data-passed={result.passed === null ? undefined : result.passed}
    >
      <ScoreRing value={result.scorePercent} label="Nota obtenida" large />
      <div className={styles.resultHeading}>
        <h2 ref={heading} tabIndex={-1} className="outline-offset-4">
          Resultado del examen
        </h2>
        <strong>
          {result.passed === null ? "Consultando estado" : result.passed ? "Aprobado" : "Reprobado"}
        </strong>
        {result.scorePercent == null ? <p>Pendiente de finalizar</p> : null}
        {result.completedAt ? <p>Finalizado: {contentDate(result.completedAt)}</p> : null}
      </div>
      {result.answers?.some((answer) => "pointsEarned" in answer) ? (
        <div className={styles.resultPoints}>
          <h3>Puntos por pregunta</h3>
          <ul>
            {result.answers.map((answer, index) =>
              "pointsEarned" in answer && "pointsPossible" in answer ? (
                <li key={answer.questionId}>
                  <div className="min-w-0 flex-1">
                    <QuestionImage
                      image={images[answer.questionId]}
                      index={index}
                      eager={index === 0}
                    />
                    <span>{answer.prompt}</span>
                  </div>
                  <strong>
                    {answer.pointsEarned} / {answer.pointsPossible} pts
                  </strong>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

type Answers = Record<string, string>;
function restoreDraft(attempt: ActiveStudentAttempt, clock: ServerClock) {
  const answers: Answers = {};
  try {
    if (remainingTime(attempt.deadlineAt, clock, performance.now()) <= 0) {
      clearDraft(attempt.attemptId);
      return { answers, warning: false };
    }
    const raw: unknown = JSON.parse(sessionStorage.getItem(draftKey(attempt.attemptId)) ?? "{}");
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const question of attempt.exam.questions) {
        const value = (raw as Record<string, unknown>)[question.id];
        if (
          typeof value === "string" &&
          (question.type === "texto_abierto" ||
            question.options.some((option) => option.id === value))
        )
          answers[question.id] = value;
      }
    }
    return { answers, warning: false };
  } catch {
    return { answers, warning: true };
  }
}
function AttemptForm({
  attempt,
  clock,
  courseId,
  finish,
  back,
}: {
  attempt: ActiveStudentAttempt;
  clock: ServerClock;
  courseId: string;
  finish: (value: Result, notice?: string, images?: Images) => void;
  back: string;
}) {
  const [questionImages, setQuestionImages] = useState<Images>(() =>
    Object.fromEntries(
      attempt.exam.questions.map((question) => [question.id, question.image ?? null]),
    ),
  );
  const imageRequest = useRef<Promise<AttemptQuestionImage[]> | null>(null);
  const imageController = useRef<AbortController | null>(null);
  useEffect(() => () => imageController.current?.abort(), []);
  const [confirmSend, setConfirmSend] = useState(false);
  const [draft] = useState(() => restoreDraft(attempt, clock));
  const [answers, setAnswers] = useState<Answers>(draft.answers);
  const [remaining, setRemaining] = useState(() =>
    remainingTime(attempt.deadlineAt, clock, performance.now()),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState(draft.warning);
  const [terminal, setTerminal] = useState(false);
  const lock = useRef(false);
  const done = useRef(false);
  const autoSent = useRef(false);
  const expiredChecked = useRef(false);
  const currentClock = useRef(clock);
  const title = useRef<HTMLHeadingElement>(null);
  const submitRef = useRef<() => void>(() => undefined);
  const expireRef = useRef<() => void>(() => undefined);
  const notify = useContentSuccess();
  const getRemaining = useCallback(
    () => remainingTime(attempt.deadlineAt, currentClock.current, performance.now()),
    [attempt.deadlineAt],
  );
  useEffect(() => {
    title.current?.focus();
  }, []);

  const update = useCallback(
    (questionId: string, value: string) => {
      if (lock.current || done.current || terminal || getRemaining() <= 0) return;
      const next = { ...answers, [questionId]: value };
      setAnswers(next);
      // Persist only this attempt's own answers, never questions, keys, tokens or URLs.
      try {
        sessionStorage.setItem(draftKey(attempt.attemptId), JSON.stringify(next));
      } catch {
        setStorageWarning(true);
      }
    },
    [answers, attempt.attemptId, getRemaining, terminal],
  );

  async function reconcile(notice?: string) {
    const state = await api.get<ExamAttempt>(`/attempts/${attempt.attemptId}`, {
      cache: "no-store",
    });
    if (state.status === "completado") {
      done.current = true;
      clearDraft(attempt.attemptId);
      notify("Intento finalizado. Consulta tu resultado.");
      finish(state, notice, questionImages);
      return true;
    }
    return false;
  }
  async function expire() {
    if (lock.current || done.current) return;
    lock.current = true;
    setBusy(true);
    setTerminal(true);
    clearDraft(attempt.attemptId);
    try {
      if (
        !(await reconcile(
          "El tiempo del intento terminó. El servidor no acepta respuestas fuera del plazo.",
        ))
      )
        setError(
          "El plazo terminó. Consulta de nuevo el resultado para confirmar su finalización.",
        );
    } catch (failure) {
      setError(studentContentError(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function refreshImage(questionId: string) {
    if (done.current || terminal || getRemaining() <= 0) {
      if (!done.current) await expire();
      throw new ApiError("Vencido", 409, { code: "ATTEMPT_EXPIRED" });
    }
    if (!imageRequest.current) {
      const controller = new AbortController();
      imageController.current = controller;
      imageRequest.current = questionImageApi
        .refresh(attempt.attemptId, controller.signal)
        .then((images) => {
          if (!controller.signal.aborted && !done.current) {
            const ids = new Set(attempt.exam.questions.map((question) => question.id));
            setQuestionImages((current) => ({
              ...current,
              ...Object.fromEntries(
                images
                  .filter((image) => ids.has(image.questionId))
                  .map((image) => [image.questionId, { url: image.url, alt: image.alt }]),
              ),
            }));
          }
          return images;
        });
    }
    const pending = imageRequest.current;
    try {
      const images = await pending;
      if (!images.some((image) => image.questionId === questionId))
        throw new ApiError("No disponible", 503, { code: "CONTENT_UNAVAILABLE" });
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === "ATTEMPT_EXPIRED" && !done.current)
        await expire();
      throw failure;
    } finally {
      if (imageRequest.current === pending) imageRequest.current = null;
    }
  }
  async function submit() {
    if (lock.current || done.current) return;
    if (terminal || getRemaining() <= 0) {
      await expire();
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(null);
    const payload: SubmitAnswerInput[] = attempt.exam.questions.flatMap((question) => {
      const value = answers[question.id];
      return !value || (question.type === "texto_abierto" && !value.trim())
        ? []
        : [
            {
              questionId: question.id,
              ...(question.type === "opcion_multiple"
                ? { selectedOptionId: value }
                : { textAnswer: value }),
            },
          ];
    });
    try {
      const result = await api.post<AttemptResult>(`/attempts/${attempt.attemptId}/submit`, {
        answers: payload,
      });
      done.current = true;
      clearDraft(attempt.attemptId);
      notify("Examen enviado correctamente.");
      finish(result, undefined, questionImages);
    } catch (failure) {
      const terminal =
        failure instanceof ApiError &&
        ["ATTEMPT_EXPIRED", "ATTEMPT_COMPLETED"].includes(failure.code ?? "");
      if (terminal) {
        clearDraft(attempt.attemptId);
        setTerminal(true);
      }
      setError(studentContentError(failure));
      // A lost response may have followed a successful submit: check before offering a retry.
      try {
        await reconcile(terminal ? studentContentError(failure) : undefined);
      } catch {
        /* Keep the mapped error and allow an explicit status check. */
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    submitRef.current = () => void submit();
    expireRef.current = () => void expire();
  });
  useEffect(() => {
    const controller = new AbortController();
    const tick = () => {
      const value = getRemaining();
      setRemaining(value);
      if (value <= 0) {
        clearDraft(attempt.attemptId);
        if (!expiredChecked.current) {
          expiredChecked.current = true;
          expireRef.current();
        }
      } else if (shouldAutoSend(value) && !autoSent.current) {
        autoSent.current = true;
        submitRef.current();
      }
    };
    const timer = window.setInterval(tick, 250);
    const visible = () => {
      if (document.visibilityState !== "visible" || done.current) return;
      tick();
      // Refresh the server sample after suspension; never move the countdown backwards.
      ownCatalog(courseId, controller.signal)
        .then((fresh) => {
          if (controller.signal.aborted) return;
          currentClock.current = {
            ...fresh.clock,
            serverMs: Math.max(
              fresh.clock.serverMs,
              serverTime(currentClock.current, performance.now()),
            ),
          };
          tick();
        })
        .catch(() => {
          /* Existing corrected clock continues; submit remains server-authoritative. */
        });
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [attempt.attemptId, courseId, getRemaining]);

  const answered = attempt.exam.questions.filter((question) =>
    Boolean(answers[question.id]?.trim()),
  ).length;
  const total = attempt.exam.questions.length;
  const requestSubmit = () => {
    if (terminal || remaining <= 0) void submit();
    else setConfirmSend(true);
  };
  return (
    <div className={styles.examPage}>
      <Link href={back} className={buttonClassName("ghost", "md", "mb-5")}>
        ← Volver al curso (el tiempo sigue corriendo)
      </Link>
      <header className={styles.attemptHeader}>
        <div className={styles.attemptHeaderTop}>
          <div className={styles.attemptHeading}>
            <span className={styles.eyebrow}>
              Intento {attempt.attemptNumber} de {attempt.maxAttemptsAplicado ?? "∞"}
            </span>
            <h1 ref={title} tabIndex={-1}>
              {attempt.exam.title}
            </h1>
            <p>
              {attempt.minutosAplicados} minutos asignados · Responde con calma, envía a tiempo.
            </p>
          </div>
          <div
            className={styles.timer}
            data-warning={remaining <= 60_000 ? "red" : remaining <= 300_000 ? "amber" : undefined}
          >
            <LearningIcon name="clock" />
            <div>
              <small>Tiempo restante</small>
              <strong role="timer" aria-label="Tiempo restante" aria-live="off">
                {countdown(remaining)}
              </strong>
            </div>
          </div>
        </div>
        <div className={styles.attemptHeaderBottom}>
          <div className={styles.answerProgress}>
            <p>
              <strong>
                {answered} / {total}
              </strong>{" "}
              preguntas respondidas
            </p>
            <div
              className={styles.progress}
              role="progressbar"
              aria-label="Preguntas respondidas"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={answered}
            >
              <span style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
            </div>
          </div>
          <Button isLoading={busy} onClick={requestSubmit}>
            {terminal || remaining <= 0 ? "Consultar resultado" : "Enviar"}
          </Button>
        </div>
        <p role="status" aria-live="polite" aria-atomic="true" className={styles.warningMessage}>
          {timeWarning(remaining)}
        </p>
      </header>
      <p className={styles.attemptDetails}>
        Límite: {contentDate(attempt.deadlineAt)}. Cerrar o salir no detiene el tiempo. Envío
        automático unos 10 segundos antes del límite.
      </p>
      {error ? <StudentError error={error} /> : null}
      {storageWarning ? (
        <p role="status" className={styles.attemptDetails}>
          No se pudo guardar el borrador en esta pestaña. Mantén la ventana abierta y envía antes
          del límite.
        </p>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          requestSubmit();
        }}
      >
        {attempt.exam.questions.map((question, index) => (
          <fieldset
            key={question.id}
            disabled={busy || terminal || remaining <= 0}
            className={styles.question}
            aria-labelledby={`attempt-question-${question.id}-label attempt-question-${question.id}-prompt`}
          >
            <legend>
              <span className={styles.questionMeta} id={`attempt-question-${question.id}-label`}>
                <span>
                  Pregunta {index + 1} de {total} · {question.points} puntos
                </span>
                {answers[question.id]?.trim() ? (
                  <span className={`${styles.chip} ${styles.success}`}>✓ Respondida</span>
                ) : null}
              </span>
            </legend>
            <QuestionImage
              image={questionImages[question.id]}
              index={index}
              eager={index === 0}
              onRetry={() => refreshImage(question.id)}
            />
            <p className={styles.questionPrompt} id={`attempt-question-${question.id}-prompt`}>
              {question.prompt}
            </p>
            {question.type === "opcion_multiple" ? (
              question.options.map((option) => (
                <label key={option.id} className={styles.answerOption}>
                  <input
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={answers[question.id] === option.id}
                    onChange={() => update(question.id, option.id)}
                  />
                  <span>{option.optionText}</span>
                </label>
              ))
            ) : (
              <label className="block text-base">
                <span>Tu respuesta</span>
                <textarea
                  rows={4}
                  value={answers[question.id] ?? ""}
                  onChange={(event) => update(question.id, event.target.value)}
                />
              </label>
            )}
          </fieldset>
        ))}
        <div className="flex justify-end pb-8">
          <Button type="submit" disabled={terminal || remaining <= 0} isLoading={busy}>
            Revisar y enviar respuestas
          </Button>
        </div>
      </form>
      <Modal
        isOpen={confirmSend && !busy && !terminal && remaining > 0}
        onClose={() => setConfirmSend(false)}
        title="¿Enviar tus respuestas?"
      >
        <p className="text-base leading-7 text-text-secondary">
          Respondiste {answered} de {total} preguntas. Una vez enviado el examen, no podrás cambiar
          las respuestas. El tiempo sigue corriendo mientras revisas.
        </p>
        <div className={styles.confirmActions}>
          <Button variant="secondary" onClick={() => setConfirmSend(false)}>
            Seguir revisando
          </Button>
          <Button
            onClick={() => {
              setConfirmSend(false);
              void submit();
            }}
          >
            Enviar examen
          </Button>
        </div>
      </Modal>
    </div>
  );
}
