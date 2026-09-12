"use client";

import Link from "next/link";

import { buttonClassName, iconButtonClassName } from "@/components/ui";
import { EditIcon } from "@/components/ui/icons";
import { useFetch } from "@/hooks/useFetch";
import type { Cohort, Course } from "@/types";

function courseLabel(course: Course | undefined): string {
  if (!course) {
    return "—";
  }
  return `${course.nombre} (Tipo ${course.tipo})`;
}

export default function CohortsPage() {
  const {
    data: cohorts,
    isLoading: isLoadingCohorts,
    error: cohortsError,
  } = useFetch<Cohort[]>("/cohorts");
  const {
    data: courses,
    isLoading: isLoadingCourses,
    error: coursesError,
  } = useFetch<Course[]>("/courses");

  const isLoading = isLoadingCohorts || isLoadingCourses;
  const error = cohortsError ?? coursesError;
  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          Cohortes
        </h1>
        <Link href="/admin/cohorts/new" className={buttonClassName()}>
          Nueva cohorte
        </Link>
      </div>

      {isLoading ? <p className="text-sm text-text-secondary">Cargando…</p> : null}
      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="overflow-x-auto rounded-md border border-border bg-bg-surface backdrop-blur-md">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-bg-sunken">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Cohorte</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Curso</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Precio</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Creada</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(cohorts ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                    Todavía no hay cohortes.
                  </td>
                </tr>
              ) : (
                (cohorts ?? []).map((cohort) => (
                  <tr key={cohort.id}>
                    <td className="px-4 py-2 text-text-primary">{cohort.nombre}</td>
                    <td className="px-4 py-2 text-text-secondary">
                      {courseLabel(coursesById.get(cohort.courseId))}
                    </td>
                    <td className="px-4 py-2 text-text-secondary">${cohort.precio.toFixed(2)}</td>
                    <td className="px-4 py-2 text-text-secondary">
                      {new Date(cohort.createdAt).toLocaleDateString("es-EC")}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/admin/cohorts/${cohort.id}/edit`}
                        aria-label={`Editar ${cohort.nombre}`}
                        title={`Editar ${cohort.nombre}`}
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
