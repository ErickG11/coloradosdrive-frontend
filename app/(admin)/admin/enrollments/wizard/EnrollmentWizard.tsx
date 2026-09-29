"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type {
  Cohort,
  ConfirmarPracticaInput,
  ConfirmarPracticaResult,
  Course,
  CreateEnrollmentInput,
  EnrollStudentResult,
} from "@/types";

import { StepConfirmar } from "./StepConfirmar";
import { StepCurso } from "./StepCurso";
import { StepDatosEstudiante } from "./StepDatosEstudiante";
import { StepPracticas } from "./StepPracticas";
import { WizardProgress } from "./WizardProgress";
import {
  INITIAL_WIZARD_STATE,
  type CourseSelection,
  type PracticeChoice,
  type StudentData,
  type WizardState,
} from "./wizardTypes";

interface EnrollmentWizardProps {
  courses: Course[];
  cohorts: Cohort[];
}

// Solo entrada (sin exit vía AnimatePresence): con mode="wait" el paso
// anterior no se desmonta hasta terminar su animación de salida, lo que en
// jsdom (sin rAF real) lo deja indefinidamente montado junto al nuevo paso
// - dos formularios con el mismo botón "Continuar" a la vez, ambigüedad
// real para tests y para cualquier lector de pantalla. Con solo entrada,
// React desmonta el paso anterior al instante (como sin animación) y el
// nuevo entra con el mismo fade+slide corto (0.15-0.2s, sin springs) que
// ya usan Modal.tsx y el drawer móvil de Sidebar.
const STEP_VARIANTS = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
};

export function EnrollmentWizard({ courses, cohorts }: EnrollmentWizardProps) {
  const [state, setState] = useState<WizardState>(INITIAL_WIZARD_STATE);
  const [isCreatingEnrollment, setIsCreatingEnrollment] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmarPracticaResult | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  function handleStudentNext(student: StudentData) {
    setState((current) => ({ ...current, student, step: 2 }));
  }

  function handleCourseBack() {
    setState((current) => ({ ...current, step: 1 }));
  }

  async function handleCourseNext(course: CourseSelection) {
    setCreateError(null);
    setIsCreatingEnrollment(true);

    try {
      const payload: CreateEnrollmentInput = {
        cedula: state.student.cedula,
        nombreCompleto: state.student.nombreCompleto,
        correo: state.student.correo,
        telefono: state.student.telefono || undefined,
        ...(course.cohortId ? { cohortId: course.cohortId } : { courseId: course.courseId }),
      };
      const result = await api.post<EnrollStudentResult>("/enrollments", payload);
      setState((current) => ({ ...current, course, enrollment: result.enrollment, step: 3 }));
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "No se pudo completar la matrícula.",
      );
    } finally {
      setIsCreatingEnrollment(false);
    }
  }

  function handlePracticeSkip() {
    setState((current) => ({ ...current, practice: null, step: 4 }));
  }

  function handlePracticeNext(practice: PracticeChoice) {
    setState((current) => ({ ...current, practice, step: 4 }));
  }

  async function handleConfirm() {
    if (!state.enrollment) return;

    if (!state.practice) {
      setIsFinished(true);
      return;
    }

    setConfirmError(null);
    setIsConfirming(true);
    try {
      const { form, suggestion, instructor } = state.practice;
      const payload: ConfirmarPracticaInput = {
        fechaInicio: form.fechaInicio,
        modalidad: form.modalidad,
        horasPorDia: form.horasPorDia,
        horaResuelta: suggestion.horaResuelta,
        instructorId: instructor.id,
        ...(form.endMode === "numeroSesiones"
          ? { numeroSesiones: form.numeroSesiones }
          : { fechaFin: form.fechaFin }),
      };
      const result = await api.post<ConfirmarPracticaResult>(
        `/admin/enrollments/${state.enrollment.id}/confirmar-practica`,
        payload,
      );
      setConfirmResult(result);
      setIsFinished(true);
    } catch (err) {
      setConfirmError(
        err instanceof ApiError ? err.message : "No se pudo confirmar el horario de práctica.",
      );
    } finally {
      setIsConfirming(false);
    }
  }

  function handleReset() {
    setState(INITIAL_WIZARD_STATE);
    setCreateError(null);
    setConfirmResult(null);
    setConfirmError(null);
    setIsFinished(false);
  }

  // Se usa enrollment.cohortId (verdad post-creación), no course.cohortId
  // (la intención antes de crear la matrícula): si hubo una condición de
  // carrera por cupo, el backend pudo haber reintentado con otra cohorte.
  const cohortSeleccionada = state.enrollment?.cohortId
    ? cohorts.find((cohort) => cohort.id === state.enrollment?.cohortId)
    : undefined;

  return (
    <div>
      <WizardProgress currentStep={state.step} />

      <motion.div
        key={state.step}
        variants={STEP_VARIANTS}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.18 }}
      >
          {state.step === 1 ? (
            <StepDatosEstudiante value={state.student} onNext={handleStudentNext} />
          ) : null}

          {state.step === 2 ? (
            <div className="flex flex-col gap-3">
              <StepCurso
                courses={courses}
                cohorts={cohorts}
                value={state.course}
                onBack={handleCourseBack}
                onNext={(course) => void handleCourseNext(course)}
              />
              {isCreatingEnrollment ? (
                <p className="text-sm text-text-secondary">Creando matrícula…</p>
              ) : null}
              {createError ? <p className="text-sm text-accent-red">{createError}</p> : null}
            </div>
          ) : null}

          {state.step === 3 && state.enrollment ? (
            <StepPracticas
              enrollment={state.enrollment}
              onSkip={handlePracticeSkip}
              onNext={handlePracticeNext}
            />
          ) : null}

          {state.step === 4 && state.enrollment && state.course ? (
            <StepConfirmar
              student={state.student}
              course={state.course}
              cohort={cohortSeleccionada}
              enrollment={state.enrollment}
              practice={state.practice}
              confirmResult={confirmResult}
              isFinished={isFinished}
              isSubmitting={isConfirming}
              error={confirmError}
              onConfirm={() => void handleConfirm()}
              onReset={handleReset}
            />
          ) : null}
      </motion.div>
    </div>
  );
}
