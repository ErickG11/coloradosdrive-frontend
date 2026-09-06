"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonClassName, Card } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Exam, ExamAttempt } from "@/types";

const TYPE_LABELS: Record<Exam["type"], string> = {
  practica: "Práctica",
  definitivo: "Definitivo",
};

interface ExamWithAttempts {
  exam: Exam;
  attempts: ExamAttempt[];
}

// GET /exams ya devuelve solo los exámenes publicados del curso de la
// inscripción activa del estudiante (filtrado del lado del backend, ver
// exam.service.ts::listExamsForStudent) - acá solo se agrega, por cada
// examen, su propio historial (GET /exams/:id/attempts/me) para decidir
// si mostrar "Tomar examen", "Continuar" o el resultado del último
// intento. No hay un endpoint que traiga ambas cosas en una sola
// petición, así que es N+1 a propósito (N = exámenes disponibles del
// estudiante, típicamente pocos).
function useStudentExams() {
  const [data, setData] = useState<ExamWithAttempts[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Reinicia el estado al montar; las siguientes actualizaciones ocurren
    // dentro de las callbacks de la promesa (patrón recomendado, mismo que
    // hooks/useFetch.ts).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    async function load() {
      try {
        const exams = await api.get<Exam[]>("/exams");
        const withAttempts = await Promise.all(
          exams.map(async (exam): Promise<ExamWithAttempts> => ({
            exam,
            attempts: await api.get<ExamAttempt[]>(`/exams/${exam.id}/attempts/me`),
          })),
        );
        if (!cancelled) {
          setData(withAttempts);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "No se pudo conectar con el servidor.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}

interface ExamStatus {
  badge: string;
  ctaLabel: string;
}

// GET /exams/:id/attempts/me viene ordenado por started_at descendente
// (ver examAttempt.service.ts), así que attempts[0] es siempre el más
// reciente. Un definitivo completado (aprobado o no) ya agotó su único
// intento - "Ver resultado" solo trae el resumen (puntaje/aprobado), no
// el detalle por pregunta (eso solo existe justo después de calificar).
function getExamStatus(exam: Exam, attempts: ExamAttempt[]): ExamStatus {
  const latest = attempts[0];

  if (!latest) {
    return { badge: "Disponible", ctaLabel: "Tomar examen" };
  }
  if (latest.status === "en_progreso") {
    return { badge: "En progreso", ctaLabel: "Continuar examen" };
  }

  const resultado = latest.passed ? "Aprobado" : "Reprobado";
  if (exam.type === "definitivo") {
    return { badge: resultado, ctaLabel: "Ver resultado" };
  }
  // práctica: intentos ilimitados, incluso después de aprobar.
  return { badge: `${resultado} (último intento)`, ctaLabel: "Tomar examen de nuevo" };
}

export default function StudentExamsPage() {
  const { data, isLoading, error } = useStudentExams();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">Exámenes</h1>

      {isLoading ? <p className="text-sm text-text-secondary">Cargando…</p> : null}
      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      {!isLoading && !error ? (
        (data ?? []).length === 0 ? (
          <Card>
            <p className="text-sm text-text-secondary">
              Todavía no hay exámenes disponibles para tu curso.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {(data ?? []).map(({ exam, attempts }) => {
              const status = getExamStatus(exam, attempts);
              return (
                <Card key={exam.id} className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-display text-lg font-semibold text-text-primary">
                      {exam.title}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {TYPE_LABELS[exam.type]} · {exam.timeLimitMinutes} min · Aprobación mínima{" "}
                      {exam.passingScorePercent}%
                    </span>
                    <span className="text-sm font-medium text-accent-blue">{status.badge}</span>
                  </div>
                  <Link href={`/student/exams/${exam.id}`} className={buttonClassName()}>
                    {status.ctaLabel}
                  </Link>
                </Card>
              );
            })}
          </div>
        )
      ) : null}
    </div>
  );
}
