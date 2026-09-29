"use client";

import { useState } from "react";

import { Button, Select } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import type { Cohort, CohortAssignmentPreview, Course } from "@/types";

import type { CourseSelection } from "./wizardTypes";

interface StepCursoProps {
  courses: Course[];
  cohorts: Cohort[];
  value: CourseSelection | null;
  onBack: () => void;
  onNext: (value: CourseSelection) => void;
}

function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-EC");
}

export function StepCurso({ courses, cohorts, value, onBack, onNext }: StepCursoProps) {
  const [selection, setSelection] = useState<CourseSelection | null>(value);
  const [preview, setPreview] = useState<CohortAssignmentPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showManualSelector, setShowManualSelector] = useState(false);

  async function handleSelectTipo(course: Course) {
    setShowManualSelector(false);
    setPreview(null);
    setPreviewError(null);
    setSelection({
      courseId: course.id,
      courseTipo: course.tipo,
      courseNombre: course.nombre,
      cohortId: null,
      manualOverride: false,
    });
    setIsLoadingPreview(true);

    try {
      const result = await api.post<CohortAssignmentPreview>("/admin/cohort-assignment/preview", {
        courseId: course.id,
      });
      setPreview(result);
      setSelection({
        courseId: course.id,
        courseTipo: course.tipo,
        courseNombre: course.nombre,
        cohortId: result.cohortId,
        manualOverride: false,
      });
    } catch (err) {
      setPreviewError(
        err instanceof ApiError ? err.message : "No se pudo consultar la cohorte sugerida.",
      );
    } finally {
      setIsLoadingPreview(false);
    }
  }

  function handleManualCohortChange(cohortId: string) {
    if (!selection) return;
    setSelection({ ...selection, cohortId: cohortId || null, manualOverride: true });
  }

  const cohortesDelCurso = selection
    ? cohorts.filter((cohort) => cohort.courseId === selection.courseId)
    : [];
  const cohorteSeleccionada = selection?.cohortId
    ? cohortesDelCurso.find((cohort) => cohort.id === selection.cohortId)
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-sm font-medium text-text-secondary">Tipo de curso</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {courses.map((course) => {
            const isSelected = selection?.courseId === course.id;
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => void handleSelectTipo(course)}
                className={cn(
                  "rounded-md border p-4 text-left transition-colors",
                  isSelected
                    ? "border-accent-blue bg-accent-blue-subtle"
                    : "border-border bg-bg-field hover:border-border-strong",
                )}
              >
                <p className="font-display text-lg font-bold text-text-primary">
                  Tipo {course.tipo}
                </p>
                <p className="text-sm text-text-secondary">{course.nombre}</p>
              </button>
            );
          })}
        </div>
      </div>

      {selection ? (
        <div className="rounded-md border border-border bg-bg-sunken p-4">
          {isLoadingPreview ? (
            <p className="text-sm text-text-secondary">Buscando cohorte disponible…</p>
          ) : previewError ? (
            <p className="text-sm text-accent-red">{previewError}</p>
          ) : preview && preview.cohortId === null ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-primary">
                Sin cohorte disponible: {preview.mensaje}. Se asignará una cohorte más adelante.
              </p>
              {!showManualSelector ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="self-start"
                  onClick={() => setShowManualSelector(true)}
                >
                  Elegir cohorte manualmente
                </Button>
              ) : null}
            </div>
          ) : cohorteSeleccionada ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-text-secondary">
                {selection.manualOverride ? "Cohorte elegida manualmente" : "Cohorte sugerida"}
              </p>
              <p className="font-display text-base font-bold text-text-primary">
                {cohorteSeleccionada.nombre}
              </p>
              <p className="text-sm text-text-secondary">
                Matrícula: {formatFecha(cohorteSeleccionada.fechaInicioMatricula)} –{" "}
                {formatFecha(cohorteSeleccionada.fechaFinMatricula)} · Curso:{" "}
                {formatFecha(cohorteSeleccionada.fechaInicioCurso)} –{" "}
                {formatFecha(cohorteSeleccionada.fechaFinCurso)}
              </p>
              {preview && "warning" in preview && preview.warning === "matricula_por_cerrar" ? (
                <p className="text-sm text-accent-red">
                  La matrícula de esta cohorte está por cerrar.
                </p>
              ) : null}
              {!showManualSelector ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="self-start"
                  onClick={() => setShowManualSelector(true)}
                >
                  Cambiar cohorte
                </Button>
              ) : null}
            </div>
          ) : null}

          {showManualSelector ? (
            <div className="mt-3">
              <Select
                label="Elegir cohorte manualmente"
                name="cohortId"
                value={selection.cohortId ?? ""}
                onChange={(event) => handleManualCohortChange(event.target.value)}
              >
                <option value="">Sin cohorte (asignar después)</option>
                {cohortesDelCurso.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.nombre} — ${cohort.precio.toFixed(2)}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 flex justify-between">
        <Button type="button" variant="secondary" onClick={onBack}>
          Atrás
        </Button>
        <Button
          type="button"
          disabled={!selection || isLoadingPreview}
          onClick={() => selection && onNext(selection)}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
