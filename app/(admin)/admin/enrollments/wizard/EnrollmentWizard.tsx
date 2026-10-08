"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { StepDatosEstudiante } from "./StepDatosEstudiante";
import { StepCurso } from "./StepCurso";
import { StepPracticas } from "./StepPracticas";
import { StepConfirmar } from "./StepConfirmar";
import { WizardProgress } from "./WizardProgress";
import {
  BASE,
  EMPTY_STUDENT,
  practicePayload,
  type CatalogEntry,
  type StudentData,
  type CourseSelection,
  type PracticeChoice,
  type ManualResult,
  type WizardStep,
} from "./wizardTypes";

interface Draft {
  student: StudentData;
  course: CourseSelection;
  practice: PracticeChoice;
}
interface Pending {
  key: string;
  payload: object;
  draft: Draft;
}
interface Operation {
  phase: string;
  result: Omit<ManualResult, "emailStatus"> | null;
  emailStatus: ManualResult["emailStatus"];
}
const STORAGE = "coloradosdrive.manual-enrollment.confirmation";
export function EnrollmentWizard() {
  const [step, setStep] = useState<WizardStep>(1),
    [student, setStudent] = useState(EMPTY_STUDENT);
  const [course, setCourse] = useState<CourseSelection | null>(null),
    [practice, setPractice] = useState<PracticeChoice | null>(null);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]),
    [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ManualResult | null>(null),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const pending = useRef<Pending | null>(null),
    inFlight = useRef(false);
  async function check(p: Pending) {
    const op = await api.get<Operation>(`${BASE}/operations/${p.key}`);
    if (op.phase === "committed" && op.result) {
      setResult({ ...op.result, emailStatus: op.emailStatus });
      setUncertain(false);
      setError(null);
      sessionStorage.removeItem(STORAGE);
    } else {
      setUncertain(op.phase !== "failed");
      if (op.phase === "failed") {
        sessionStorage.removeItem(STORAGE);
        setError(
          (current) =>
            current ?? "La operación no se confirmó. Puedes corregir el borrador o reintentar.",
        );
      }
    }
  }
  useEffect(() => {
    api
      .get<CatalogEntry[]>(`${BASE}/catalog`)
      .then(setCatalog)
      .catch((e) => setError(e instanceof ApiError ? e.message : "No se pudo cargar el catálogo."));
    // Restaurar almacenamiento externo después del montaje, antes de consultar
    // el estado. El temporizador se cancela si el componente se desmonta.
    const restore = setTimeout(() => {
      const saved = sessionStorage.getItem(STORAGE);
      if (saved) {
        try {
          const p = JSON.parse(saved) as Pending;
          if (!p.key || !p.draft?.student || !p.draft?.course || !p.draft?.practice)
            throw Error("Borrador inválido");
          pending.current = p;
          setStudent(p.draft.student);
          setCourse(p.draft.course);
          setPractice(p.draft.practice);
          setStep(4);
          setUncertain(true);
          check(p).catch(() =>
            setError(
              "No se pudo recuperar el estado. Consulta de nuevo antes de crear otra operación.",
            ),
          );
        } catch {
          sessionStorage.removeItem(STORAGE);
        }
      }
    }, 0);
    return () => clearTimeout(restore);
  }, []);
  function edit() {
    pending.current = null;
    sessionStorage.removeItem(STORAGE);
    setError(null);
  }
  async function confirm() {
    if (!course || !practice || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    if (!pending.current) {
      const { form, suggestion, instructor } = practice;
      pending.current = {
        key: crypto.randomUUID(),
        draft: { student, course, practice },
        payload: {
          student:
            student.mode === "existing"
              ? { mode: "existing", id: student.id }
              : {
                  mode: "new",
                  cedula: student.cedula,
                  nombreCompleto: student.nombreCompleto,
                  correo: student.correo,
                  telefono: student.telefono || undefined,
                },
          courseType: course.courseTipo,
          cohortId: course.cohortId,
          automatic: !course.manualOverride,
          practice: {
            ...practicePayload(form),
            ...(suggestion && instructor
              ? { horaResuelta: suggestion.horaResuelta, instructorId: instructor.id }
              : {}),
          },
        },
      };
    }
    const p = pending.current;
    sessionStorage.setItem(STORAGE, JSON.stringify(p));
    try {
      setResult(
        await api.post<ManualResult>(`${BASE}/confirm`, p.payload, {
          headers: { "Idempotency-Key": p.key },
        }),
      );
      setUncertain(false);
      sessionStorage.removeItem(STORAGE);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No se pudo confirmar. Consulta el estado antes de reintentar.",
      );
      try {
        await check(p);
      } catch (statusError) {
        if (statusError instanceof ApiError && statusError.status === 404) {
          setUncertain(false);
          sessionStorage.removeItem(STORAGE);
        } else setUncertain(true);
      }
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  function reset() {
    edit();
    setStudent(EMPTY_STUDENT);
    setCourse(null);
    setPractice(null);
    setResult(null);
    setStep(1);
    setUncertain(false);
  }
  return (
    <div>
      <WizardProgress currentStep={step} />
      {step === 1 && (
        <StepDatosEstudiante
          value={student}
          onNext={(s) => {
            edit();
            setStudent(s);
            setStep(2);
          }}
        />
      )}
      {step === 2 && (
        <StepCurso
          catalog={catalog}
          value={course}
          onBack={() => setStep(1)}
          onNext={(c) => {
            edit();
            setCourse(c);
            setStep(3);
          }}
        />
      )}
      {step === 3 && course && (
        <StepPracticas
          course={course}
          value={practice}
          onBack={() => setStep(2)}
          onNext={(p) => {
            edit();
            setPractice(p);
            setStep(4);
          }}
        />
      )}
      {step === 4 && course && practice && (
        <StepConfirmar
          student={student}
          course={course}
          practice={practice}
          result={result}
          busy={busy}
          error={error}
          uncertain={uncertain}
          onConfirm={() => void confirm()}
          onBack={() => {
            edit();
            setStep(3);
          }}
          onReset={reset}
          onCheck={() => {
            if (pending.current)
              void check(pending.current).catch(() => setError("No se pudo consultar el estado."));
          }}
          onResend={async (regenerate) => {
            if (!result) return;
            setBusy(true);
            setError(null);
            try {
              setResult(
                await api.post<ManualResult>(
                  `${BASE}/operations/${result.operationId}/resend-email`,
                  { regenerateTemporaryPassword: regenerate },
                ),
              );
            } catch (e) {
              setError(
                e instanceof ApiError
                  ? e.message
                  : "No se pudo reenviar. Consulta el estado de envío.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      {error && step !== 4 && (
        <p role="alert" className="text-accent-red">
          {error}
        </p>
      )}
    </div>
  );
}
