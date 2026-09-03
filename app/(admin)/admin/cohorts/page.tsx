"use client";

import Link from "next/link";

import { buttonClassName } from "@/components/ui";
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-zinc-900">Cohortes</h1>
        <Link href="/admin/cohorts/new" className={buttonClassName()}>
          Nueva cohorte
        </Link>
      </div>

      {isLoading ? <p className="text-sm text-zinc-600">Cargando…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-zinc-700">Cohorte</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-700">Curso</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-700">Precio</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-700">Creada</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-700">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(cohorts ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                    Todavía no hay cohortes.
                  </td>
                </tr>
              ) : (
                (cohorts ?? []).map((cohort) => (
                  <tr key={cohort.id}>
                    <td className="px-4 py-2 text-zinc-900">{cohort.nombre}</td>
                    <td className="px-4 py-2 text-zinc-700">
                      {courseLabel(coursesById.get(cohort.courseId))}
                    </td>
                    <td className="px-4 py-2 text-zinc-700">${cohort.precio.toFixed(2)}</td>
                    <td className="px-4 py-2 text-zinc-700">
                      {new Date(cohort.createdAt).toLocaleDateString("es-EC")}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/admin/cohorts/${cohort.id}/edit`}
                        className="text-zinc-900 underline underline-offset-2"
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
