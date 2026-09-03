"use client";

import { useParams } from "next/navigation";

import { Card } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import type { Cohort, Course } from "@/types";

import { CohortForm } from "../../CohortForm";

export default function EditCohortPage() {
  const params = useParams<{ id: string }>();
  const {
    data: courses,
    isLoading: isLoadingCourses,
    error: coursesError,
  } = useFetch<Course[]>("/courses");
  const {
    data: cohorts,
    isLoading: isLoadingCohorts,
    error: cohortsError,
  } = useFetch<Cohort[]>("/cohorts");

  const isLoading = isLoadingCourses || isLoadingCohorts;
  const error = coursesError ?? cohortsError;
  const cohort = cohorts?.find((candidate) => candidate.id === params.id);

  return (
    <Card title="Editar cohorte">
      {isLoading ? <p className="text-sm text-text-secondary">Cargando…</p> : null}
      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
      {!isLoading && !error && !cohort ? (
        <p className="text-sm text-accent-red">No se encontró la cohorte.</p>
      ) : null}
      {courses && cohort ? (
        <CohortForm
          courses={courses}
          cohortId={cohort.id}
          initialValues={{
            courseId: cohort.courseId,
            nombre: cohort.nombre,
            precio: String(cohort.precio),
            cupoMaximo: String(cohort.cupoMaximo),
            fechaInicio: cohort.fechaInicio,
            fechaFin: cohort.fechaFin,
          }}
        />
      ) : null}
    </Card>
  );
}
