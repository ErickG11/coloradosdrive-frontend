"use client";

import { useParams } from "next/navigation";

import { Card, FormError } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import type { CohortDetail, Course } from "@/types";

import { CohortForm } from "../../CohortForm";

export default function EditCohortPage() {
  const params = useParams<{ id: string }>();
  const {
    data: courses,
    isLoading: isLoadingCourses,
    error: coursesError,
  } = useFetch<Course[]>("/courses");
  const {
    data: cohort,
    isLoading: isLoadingCohort,
    error: cohortError,
    errorStatus: cohortErrorStatus,
  } = useFetch<CohortDetail>(`/cohorts/${encodeURIComponent(params.id)}`);

  // 404 (no existe) y 400 (id que no es UUID) se muestran igual.
  const notFound = cohortErrorStatus === 404 || cohortErrorStatus === 400;
  const isLoading = isLoadingCourses || isLoadingCohort;
  const error = coursesError ?? (notFound ? null : cohortError);

  return (
    <Card title="Editar cohorte" titleAs="h1">
      {isLoading ? <p className="text-sm text-text-secondary">Cargando…</p> : null}
      {error ? <FormError>{error}</FormError> : null}
      {notFound ? <FormError>No se encontró la cohorte.</FormError> : null}
      {courses && cohort && !notFound ? (
        <CohortForm
          courses={courses}
          cohortId={cohort.id}
          version={cohort.updatedAt}
          initialValues={{
            courseId: cohort.courseId,
            nombre: cohort.nombre,
            precio: String(cohort.precio),
            cupoMaximo: String(cohort.cupoMaximo),
            fechaInicioMatricula: cohort.fechaInicioMatricula,
            fechaFinMatricula: cohort.fechaFinMatricula,
            fechaInicioCurso: cohort.fechaInicioCurso,
            fechaFinCurso: cohort.fechaFinCurso,
            tipoModalidad: cohort.tipoModalidad ?? "",
            horariosCapacitacionTeoria: cohort.horariosCapacitacionTeoria ?? "",
            numeroVehiculos: cohort.numeroVehiculos === null ? "" : String(cohort.numeroVehiculos),
            numeroAulas: cohort.numeroAulas === null ? "" : String(cohort.numeroAulas),
          }}
        />
      ) : null}
    </Card>
  );
}
