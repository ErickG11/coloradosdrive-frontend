"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

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
    refetch: refetchCohort,
  } = useFetch<CohortDetail>(`/cohorts/${encodeURIComponent(params.id)}`);

  // 404 (no existe) y 400 (id que no es UUID) se muestran igual.
  const notFound = cohortErrorStatus === 404 || cohortErrorStatus === 400;
  const isLoading = isLoadingCourses || isLoadingCohort;
  const error = coursesError ?? (notFound ? null : cohortError);
  // Cada recarga monta un formulario nuevo con los datos y la versión
  // actuales (descarta lo escrito y los errores anteriores).
  const [reloadCount, setReloadCount] = useState(0);
  // Aviso tras recargar; se oculta en cuanto el usuario edita o envía.
  const [showReloadNotice, setShowReloadNotice] = useState(false);

  function handleReload() {
    setReloadCount((count) => count + 1);
    setShowReloadNotice(true);
    refetchCohort();
  }

  const reloadNotice =
    showReloadNotice && !isLoadingCohort && cohort && !notFound && !cohortError
      ? "Se cargaron los datos actuales de la cohorte. Revísalos y vuelve a guardar."
      : "";

  return (
    <Card title="Editar cohorte" titleAs="h1">
      {isLoading ? <p className="text-sm text-text-secondary">Cargando…</p> : null}
      {error ? <FormError>{error}</FormError> : null}
      {notFound ? <FormError>No se encontró la cohorte.</FormError> : null}
      {/* Región viva siempre montada: solo cambia su texto, así se anuncia. */}
      <p role="status" className={reloadNotice ? "mb-4 text-sm text-text-secondary" : undefined}>
        {reloadNotice}
      </p>
      {courses && cohort && !isLoadingCohort && !notFound && !cohortError ? (
        <CohortForm
          key={reloadCount}
          onReload={handleReload}
          onUserActivity={() => setShowReloadNotice(false)}
          courses={courses}
          cohortId={cohort.id}
          version={cohort.updatedAt}
          alumnos={cohort.alumnos}
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
