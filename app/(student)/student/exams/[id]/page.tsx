"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button, Card, Textarea } from "@/components/ui";
import { useCountdown } from "@/hooks/useCountdown";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type {
  AttemptResult,
  Exam,
  ExamAttempt,
  ExamForStudent,
  StartAttemptResult,
  SubmitAnswerInput,
} from "@/types";

type AnswerDraft = { selectedOptionId?: string; textAnswer?: string };

type View =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  // Intento completado, leído del historial (GET /exams/:id/attempts/me):
  // solo trae puntaje/aprobado, nunca el detalle por pregunta (eso solo
  // existe en la respuesta inmediata de submit, ver phase "submitted").
  | { phase: "summary"; exam: Exam; attempt: ExamAttempt }
  // Sin intento todavía: pantalla previa con los metadatos del examen
  // antes de arrancar el cronómetro.
  | { phase: "start"; exam: Exam }
  | { phase: "answering"; attemptId: string; startedAt: string; exam: ExamForStudent }
  | { phase: "submitted"; result: AttemptResult };

const TYPE_LABELS: Record<Exam["type"], string> = {
  practica: "Práctica",
  definitivo: "Definitivo",
};

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function TakeExamPage() {
  const params = useParams<{ id: string }>();
  const examId = params.id;
  const [view, setView] = useState<View>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [exams, attempts] = await Promise.all([
          api.get<Exam[]>("/exams"),
          api.get<ExamAttempt[]>(`/exams/${examId}/attempts/me`),
        ]);
        if (cancelled) return;

        const exam = exams.find((candidate) => candidate.id === examId);
        if (!exam) {
          setView({ phase: "error", message: "Examen no encontrado." });
          return;
        }

        const latest = attempts[0];
        if (latest?.status === "completado") {
          setView({ phase: "summary", exam, attempt: latest });
          return;
        }
        if (latest?.status === "en_progreso") {
          const started = await api.post<StartAttemptResult>(`/exams/${examId}/attempts`);
          if (!cancelled) {
            setView({
              phase: "answering",
              attemptId: started.attemptId,
              startedAt: started.startedAt,
              exam: started.exam,
            });
          }
          return;
        }
        setView({ phase: "start", exam });
      } catch (err) {
        if (!cancelled) {
          setView({
            phase: "error",
            message: err instanceof ApiError ? err.message : "No se pudo conectar con el servidor.",
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  async function handleStart() {
    setView({ phase: "loading" });
    try {
      const started = await api.post<StartAttemptResult>(`/exams/${examId}/attempts`);
      setView({
        phase: "answering",
        attemptId: started.attemptId,
        startedAt: started.startedAt,
        exam: started.exam,
      });
    } catch (err) {
      setView({
        phase: "error",
        message: err instanceof ApiError ? err.message : "No se pudo iniciar el examen.",
      });
    }
  }

  if (view.phase === "loading") {
    return <p className="text-sm text-text-secondary">Cargando…</p>;
  }

  if (view.phase === "error") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-accent-red">{view.message}</p>
        <BackToListLink />
      </div>
    );
  }

  if (view.phase === "start") {
    return <StartScreen exam={view.exam} onStart={() => void handleStart()} />;
  }

  if (view.phase === "summary") {
    return (
      <SummaryScreen
        exam={view.exam}
        attempt={view.attempt}
        onRetry={view.exam.type === "practica" ? () => void handleStart() : undefined}
      />
    );
  }

  if (view.phase === "answering") {
    return (
      <AnsweringScreen
        attemptId={view.attemptId}
        startedAt={view.startedAt}
        exam={view.exam}
        onSubmitted={(result) => setView({ phase: "submitted", result })}
      />
    );
  }

  return <ResultDetailScreen result={view.result} />;
}

function BackToListLink() {
  return (
    <Link
      href="/student/exams"
      className="text-sm text-accent-blue underline underline-offset-2 hover:text-accent-blue-hover"
    >
      Volver al listado de exámenes
    </Link>
  );
}

function StartScreen({ exam, onStart }: { exam: Exam; onStart: () => void }) {
  return (
    <Card title={exam.title} className="flex flex-col gap-4">
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-text-secondary">Tipo</dt>
          <dd className="text-text-primary">{TYPE_LABELS[exam.type]}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Tiempo límite</dt>
          <dd className="text-text-primary">{exam.timeLimitMinutes} minutos</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Aprobación mínima</dt>
          <dd className="text-text-primary">{exam.passingScorePercent}%</dd>
        </div>
      </dl>
      <p className="text-sm text-text-secondary">
        El cronómetro empieza a correr apenas presiones «Comenzar examen». Una vez iniciado, el
        tiempo no se detiene aunque cierres esta pantalla.
      </p>
      <Button type="button" onClick={onStart} className="self-start">
        Comenzar examen
      </Button>
    </Card>
  );
}

function SummaryScreen({
  exam,
  attempt,
  onRetry,
}: {
  exam: Exam;
  attempt: ExamAttempt;
  onRetry?: () => void;
}) {
  const resultado = attempt.passed ? "Aprobado" : "Reprobado";
  return (
    <Card title={exam.title} className="flex flex-col gap-4">
      <p className="font-display text-2xl font-bold text-text-primary">
        {attempt.scorePercent?.toFixed(2)}% — {resultado}
      </p>
      <p className="text-sm text-text-secondary">
        {exam.type === "definitivo"
          ? "Este examen es definitivo: ya usaste tu único intento permitido."
          : "Este resultado corresponde a tu último intento. Puedes volver a tomar este examen de práctica cuando quieras."}
      </p>
      <div className="flex items-center gap-4">
        <BackToListLink />
        {onRetry ? (
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            Tomar examen de nuevo
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function AnsweringScreen({
  attemptId,
  startedAt,
  exam,
  onSubmitted,
}: {
  attemptId: string;
  startedAt: string;
  exam: ExamForStudent;
  onSubmitted: (result: AttemptResult) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasSubmittedRef = useRef(false);
  const { remainingSeconds } = useCountdown(startedAt, exam.timeLimitMinutes);

  async function submit() {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setIsSubmitting(true);
    setError(null);

    const payloadAnswers: SubmitAnswerInput[] = Object.entries(answers).map(
      ([questionId, draft]) => ({ questionId, ...draft }),
    );

    try {
      const result = await api.post<AttemptResult>(`/attempts/${attemptId}/submit`, {
        answers: payloadAnswers,
      });
      onSubmitted(result);
    } catch (err) {
      hasSubmittedRef.current = false;
      setIsSubmitting(false);
      setError(err instanceof ApiError ? err.message : "No se pudo calificar el examen.");
    }
  }

  // Auto-submit al agotarse el cronómetro visual: el backend igual
  // autofinaliza un intento vencido si nunca llega este submit (ver
  // docs/adr/005 en coloradosdrive-backend), esto solo evita que el
  // estudiante tenga que hacer clic manualmente cuando ya se acabó el
  // tiempo. Depende del booleano derivado (no de `submit`, que cambia en
  // cada render) para que el efecto se dispare una sola vez al cruzar a
  // cero, con las respuestas más recientes vía el closure de ese render.
  useEffect(() => {
    if (remainingSeconds <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds <= 0]);

  function setSelectedOption(questionId: string, optionId: string) {
    setAnswers((current) => ({ ...current, [questionId]: { selectedOptionId: optionId } }));
  }

  function setTextAnswer(questionId: string, textAnswer: string) {
    setAnswers((current) => ({ ...current, [questionId]: { textAnswer } }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-md border border-border bg-bg-surface-raised px-4 py-3 backdrop-blur-md">
        <span className="font-display text-lg font-semibold text-text-primary">{exam.title}</span>
        <span
          className="font-display text-lg font-semibold text-text-primary"
          aria-label="Tiempo restante"
        >
          {formatRemaining(remainingSeconds)}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {exam.questions.map((question, index) => (
          <Card key={question.id} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-text-secondary">Pregunta {index + 1}</p>
            <p className="text-text-primary">{question.prompt}</p>

            {question.type === "opcion_multiple" ? (
              <div className="flex flex-col gap-2">
                {question.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-3 rounded-sm border border-border bg-bg-field px-3 py-2"
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      checked={answers[question.id]?.selectedOptionId === option.id}
                      onChange={() => setSelectedOption(question.id, option.id)}
                      className="h-4 w-4 accent-accent-red"
                    />
                    <span className="text-sm text-text-primary">{option.optionText}</span>
                  </label>
                ))}
              </div>
            ) : (
              <Textarea
                aria-label={`Respuesta a la pregunta ${index + 1}`}
                value={answers[question.id]?.textAnswer ?? ""}
                onChange={(event) => setTextAnswer(question.id, event.target.value)}
              />
            )}
          </Card>
        ))}
      </div>

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      <Button type="button" onClick={() => void submit()} isLoading={isSubmitting}>
        Enviar respuestas
      </Button>
    </div>
  );
}

function ResultDetailScreen({ result }: { result: AttemptResult }) {
  const resultado = result.passed ? "Aprobado" : "Reprobado";
  return (
    <Card title="Resultado" className="flex flex-col gap-4">
      <p className="font-display text-2xl font-bold text-text-primary">
        {result.scorePercent.toFixed(2)}% — {resultado}
      </p>
      <div className="flex flex-col divide-y divide-border">
        {result.answers.map((answer, index) => (
          <div key={answer.questionId} className="flex flex-col gap-1 py-3">
            <p className="text-sm font-medium text-text-secondary">Pregunta {index + 1}</p>
            <p className="text-text-primary">{answer.prompt}</p>
            <p
              className={
                answer.isCorrect
                  ? "text-sm font-medium text-accent-blue"
                  : "text-sm text-accent-red"
              }
            >
              {answer.isCorrect ? "Correcta" : "Incorrecta"} — {answer.pointsEarned}/
              {answer.pointsPossible} pts
            </p>
          </div>
        ))}
      </div>
      <BackToListLink />
    </Card>
  );
}
