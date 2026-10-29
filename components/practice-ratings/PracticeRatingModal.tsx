"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button, Modal, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { formatPracticeDateTime } from "@/lib/utils/schoolTime";
import type { PendingPracticeRating, SubmittedPracticeRating } from "@/types/practiceRating";

export function ratingErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "RATING_ALREADY_SUBMITTED":
        return "Ya calificaste esta práctica. Solo se permite una respuesta.";
      case "RATING_WINDOW_CLOSED":
        return "Terminó el plazo para calificar esta práctica.";
      case "RATING_NOT_ELIGIBLE":
        return "Esta práctica ya no está habilitada para calificar.";
      case "PRACTICE_NOT_FOUND":
        return "Esta práctica ya no está disponible para tu cuenta.";
      case "INVALID_FIELD":
        return "Revisa la calificación y el comentario antes de enviar.";
    }
    if (error.status === 403) return "Tu cuenta no tiene permiso para enviar esta encuesta.";
    if (error.status === 404) return "Esta práctica ya no está disponible para tu cuenta.";
    if (error.status === 409) return "La encuesta cambió. Actualiza la lista e inténtalo de nuevo.";
    if (error.status === 400) return "Revisa los datos de la encuesta antes de enviar.";
  }
  return "No pudimos enviar tu calificación. Inténtalo de nuevo.";
}

interface PracticeRatingModalProps {
  practice: PendingPracticeRating | null;
  onClose: () => void;
  onSubmitted: () => void;
  onStale: () => void;
}

export function PracticeRatingModal({
  practice,
  onClose,
  onSubmitted,
  onStale,
}: PracticeRatingModalProps) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const sending = useRef(false);
  const trimmed = comment.trim();
  const commentLength = Array.from(trimmed).length;
  const tooLong = commentLength > 1000;

  function close() {
    if (sending.current) return;
    setScore(null);
    setComment("");
    setError(null);
    setStale(false);
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!practice || sending.current || stale || score === null || tooLong) return;
    sending.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await api.post<SubmittedPracticeRating>("/estudiantes/practice-ratings", {
        practiceSlotId: practice.practiceSlotId,
        score,
        ...(trimmed ? { comment: trimmed } : {}),
      });
      setScore(null);
      setComment("");
      onSubmitted();
    } catch (failure) {
      setError(ratingErrorMessage(failure));
      if (failure instanceof ApiError && (failure.status === 409 || failure.status === 404)) {
        setStale(true);
        onStale();
      }
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={practice !== null} onClose={close} title="Calificar práctica">
      {practice ? (
        <form
          onSubmit={(event) => {
            void submit(event);
          }}
          className="flex flex-col gap-5"
        >
          <p className="text-sm text-text-secondary">
            Instructor: <strong className="text-text-primary">{practice.instructorName}</strong>
            <br />
            Práctica:{" "}
            <time dateTime={practice.scheduledAt}>
              {formatPracticeDateTime(practice.scheduledAt, true)}
            </time>
          </p>
          <fieldset disabled={submitting || stale}>
            <legend className="mb-2 text-sm font-medium text-text-primary">
              Calificación (obligatoria)
            </legend>
            <div className="flex flex-wrap gap-1" aria-label="Calificación de 1 a 5 estrellas">
              {[1, 2, 3, 4, 5].map((value) => (
                <label
                  key={value}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm text-2xl text-text-secondary focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus"
                >
                  <input
                    type="radio"
                    name="score"
                    value={value}
                    checked={score === value}
                    onChange={() => setScore(value)}
                    aria-label={`${value} ${value === 1 ? "estrella" : "estrellas"}`}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={value <= (score ?? 0) ? "text-brand-primary" : "text-text-disabled"}
                  >
                    ★
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <Textarea
              label="Comentario (opcional)"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={submitting || stale}
              error={tooLong ? "El comentario admite máximo 1000 caracteres." : undefined}
              aria-describedby="rating-comment-count"
            />
            <p id="rating-comment-count" className="mt-1 text-right text-xs text-text-secondary">
              {commentLength}/1000 caracteres
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-status-error">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={close} disabled={submitting}>
              Cerrar
            </Button>
            <Button
              type="submit"
              isLoading={submitting}
              disabled={score === null || tooLong || stale || submitting}
            >
              Enviar calificación
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
