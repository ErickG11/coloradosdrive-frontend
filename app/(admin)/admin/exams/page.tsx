"use client";

import Link from "next/link";

import { buttonClassName } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import type { Course, Exam } from "@/types";

const TYPE_LABELS: Record<Exam["type"], string> = {
  practica: "Práctica",
  definitivo: "Definitivo",
};

function courseLabel(course: Course | undefined): string {
  if (!course) {
    return "—";
  }
  return `${course.nombre} (Tipo ${course.tipo})`;
}

export default function ExamsPage() {
  const { data: exams, isLoading: isLoadingExams, error: examsError } = useFetch<Exam[]>("/exams");
  const {
    data: courses,
    isLoading: isLoadingCourses,
    error: coursesError,
  } = useFetch<Course[]>("/courses");

  const isLoading = isLoadingExams || isLoadingCourses;
  const error = examsError ?? coursesError;
  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          Exámenes
        </h1>
        <Link href="/admin/exams/new" className={buttonClassName()}>
          Nuevo examen
        </Link>
      </div>

      {isLoading ? <p className="text-sm text-text-secondary">Cargando…</p> : null}
      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="overflow-x-auto rounded-md border border-border bg-bg-surface backdrop-blur-md">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-bg-sunken">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Título</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Curso</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Tipo</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Publicado</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(exams ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                    Todavía no hay exámenes.
                  </td>
                </tr>
              ) : (
                (exams ?? []).map((exam) => (
                  <tr key={exam.id}>
                    <td className="px-4 py-2 text-text-primary">{exam.title}</td>
                    <td className="px-4 py-2 text-text-secondary">
                      {courseLabel(coursesById.get(exam.courseId))}
                    </td>
                    <td className="px-4 py-2 text-text-secondary">{TYPE_LABELS[exam.type]}</td>
                    <td className="px-4 py-2 text-text-secondary">
                      {exam.isPublished ? "Sí" : "No"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/admin/exams/${exam.id}/edit`}
                        className="text-accent-blue underline underline-offset-2 hover:text-accent-blue-hover"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
