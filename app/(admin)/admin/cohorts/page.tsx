"use client";

import Link from "next/link";

import { PageHeader, buttonClassName, iconButtonClassName } from "@/components/ui";
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
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Cohortes"
        count={cohorts?.length}
        actions={
          <Link href="/admin/cohorts/new" className={buttonClassName()}>
            Nueva cohorte
          </Link>
        }
      />

      {isLoading ? (
        <p role="status" className="text-sm text-text-secondary">
          Cargando…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-accent-red">
          {error}
        </p>
      ) : null}

      {!isLoading && !error ? (
        <div className="relative min-w-0 max-w-full overflow-x-auto rounded-md border border-border bg-bg-surface">
          <table className="w-full min-w-[36rem] divide-y divide-border text-sm">
            <caption className="sr-only">Listado de cohortes</caption>
            <thead className="bg-bg-sunken">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-medium text-text-secondary">
                  Cohorte
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium text-text-secondary">
                  Curso
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium text-text-secondary">
                  Precio
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium text-text-secondary">
                  Creada
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium text-text-secondary">
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
