"use client";

import { Button } from "@/components/ui";
import { CheckIcon } from "@/components/ui/icons";
import type { Cohort, ConfirmarPracticaResult, Enrollment } from "@/types";

import type { CourseSelection, PracticeChoice, StudentData } from "./wizardTypes";

interface StepConfirmarProps {
  student: StudentData;
  course: CourseSelection;
  cohort: Cohort | undefined;
  enrollment: Enrollment;
  practice: PracticeChoice | null;
  confirmResult: ConfirmarPracticaResult | null;
  isFinished: boolean;
  isSubmitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onReset: () => void;
}

export function StepConfirmar({
  student,
  course,
  cohort,
  practice,
  confirmResult,
  isFinished,
  isSubmitting,
  error,
  onConfirm,
  onReset,
}: StepConfirmarProps) {
  if (isFinished) {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-start gap-2 text-sm text-accent-blue">
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {student.nombreCompleto} fue matriculado correctamente. Recibirá sus credenciales de
            acceso en {student.correo}.
          </span>
        </p>
        <div className="rounded-md border border-border bg-bg-sunken p-4 text-sm text-text-primary">
          <p>
            Curso: Tipo {course.courseTipo} — {course.courseNombre}
          </p>
          <p>Cohorte: {cohort ? cohort.nombre : "Sin asignar todavía"}</p>
          {confirmResult ? (
            <p>
              Práctica: {confirmResult.slotsCreados} sesiones programadas (
              {confirmResult.horasProgramadas}
              {confirmResult.horasRequeridas !== null
                ? ` / ${confirmResult.horasRequeridas} horas requeridas`
                : " horas"}
              )
            </p>
          ) : (
            <p>Práctica: sin programar todavía</p>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={onReset}>
            Matricular otro estudiante
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-border bg-bg-sunken p-4 text-sm text-text-primary">
        <p className="mb-2 font-display text-base font-bold text-text-primary">Resumen</p>
        <p>
          {student.nombreCompleto} — {student.cedula}
        </p>
        <p>{student.correo}</p>
        <p className="mt-2">
          Curso: Tipo {course.courseTipo} — {course.courseNombre}
        </p>
        <p>Cohorte: {cohort ? cohort.nombre : "Sin asignar todavía (pendiente de cohorte)"}</p>
        {practice ? (
          <p className="mt-2">
            Práctica: {practice.suggestion.totalSesiones} sesiones desde{" "}
            {practice.form.fechaInicio}, {practice.suggestion.horaResuelta}, instructor{" "}
            {practice.instructor.nombreCompleto}
          </p>
        ) : (
          <p className="mt-2">Práctica: no se programó en este flujo.</p>
        )}
      </div>

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="button" isLoading={isSubmitting} onClick={onConfirm}>
          {practice ? "Confirmar matrícula y práctica" : "Finalizar matrícula"}
        </Button>
      </div>
    </div>
  );
}
