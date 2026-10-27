"use client";

import Link from "next/link";

import {
  FormError,
  PageHeader,
  StatusBadge,
  buttonClassName,
  iconButtonClassName,
} from "@/components/ui";
import { EditIcon } from "@/components/ui/icons";
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
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Exámenes"
        count={exams?.length}
        actions={
          <Link href="/admin/exams/new" className={buttonClassName()}>
            Nuevo examen
          </Link>
        }
      />

      {isLoading ? (
        <p role="status" className="text-sm text-text-secondary">
          Cargando…
        </p>
      ) : null}
      {error ? <FormError>{error}</FormError> : null}

      {!isLoading && !error ? (
        <div className="relative min-w-0 max-w-full overflow-x-auto rounded-md border border-border bg-bg-surface">
          <table className="w-full min-w-[36rem] divide-y divide-border text-sm">
            <caption className="sr-only">Listado de exámenes</caption>
            <thead className="bg-bg-sunken">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-medium text-text-secondary">
                  Título
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium text-text-secondary">
                  Curso
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium text-text-secondary">
                  Tipo
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium text-text-secondary">
                  Publicado
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium text-text-secondary">
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
                      <StatusBadge status={exam.isPublished ? "activo" : "pendiente"}>
                        {exam.isPublished ? "Sí" : "No"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/admin/exams/${exam.id}/edit`}
                        aria-label={`Editar ${exam.title}`}
                        title={`Editar ${exam.title}`}
                        className={iconButtonClassName("ghost", "ml-auto")}
                      >
                        <EditIcon className="h-5 w-5" />
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
