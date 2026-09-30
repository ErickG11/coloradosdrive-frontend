"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import type { StudentData, CourseSelection, PracticeChoice, ManualResult } from "./wizardTypes";
export function StepConfirmar({
  student,
  course,
  practice,
  result,
  busy,
  error,
  uncertain,
  onConfirm,
  onBack,
  onReset,
  onCheck,
  onResend,
}: {
  student: StudentData;
  course: CourseSelection;
  practice: PracticeChoice;
  result: ManualResult | null;
  busy: boolean;
  error: string | null;
  uncertain: boolean;
  onConfirm: () => void;
  onBack: () => void;
  onReset: () => void;
  onCheck: () => void;
  onResend: (regenerate: boolean) => Promise<void>;
}) {
  const [regenerate, setRegenerate] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-bold">{result ? "Matrícula confirmada" : "Revisar y confirmar"}</h2>
      <div className="rounded-md border border-border p-4">
        <p>
          {student.nombreCompleto} · {student.cedula}
        </p>
        <p>{student.correo}</p>
        <p>
          {student.mode === "existing"
            ? "Cuenta existente: conserva sus credenciales."
            : "Cuenta nueva: recibirá una contraseña temporal y deberá cambiarla."}
        </p>
        <p>
          Tipo {course.courseTipo}: {course.courseNombre}
        </p>
        <p>Cohorte: {course.cohort?.nombre ?? "Pendiente de cohorte"}</p>
        <p>
          Inicio elegido: {practice.form.fechaInicio} · primer día efectivo:{" "}
          {practice.plan.primerDiaEfectivo} · fecha final: {practice.plan.fechaFinElegida}
        </p>
        <p>
          {practice.plan.dias} días · {practice.plan.bloques} bloques de 60 minutos ·{" "}
          {practice.plan.horas} horas ·{" "}
          {practice.form.manual ? "ajuste manual" : "cálculo automático"}
        </p>
        {practice.suggestion && (
          <p>
            Hora: {practice.suggestion.horaResuelta} · Instructor:{" "}
            {practice.instructor?.nombreCompleto}
          </p>
        )}
        {!course.cohortId && (
          <p>
            Se conserva el plan; no se generan franjas hasta asignar cohorte. Esa gestión posterior
            está pendiente.
          </p>
        )}
        {result && (
          <>
            <p>
              Estado: {result.status} · {result.slotsCreated} bloques programados
            </p>
            <p>
              Correo:{" "}
              {result.emailStatus === "sent"
                ? "enviado"
                : result.emailStatus === "failed"
                  ? "falló; la matrícula sigue confirmada"
                  : result.emailStatus === "sending"
                    ? "en curso o pendiente de verificar"
                    : "pendiente"}
            </p>
            <p>Operación: {result.operationId}</p>
          </>
        )}
      </div>
      {!result && (
        <p>
          Los pasos anteriores solo prepararon el borrador. Al confirmar se revalidan cohorte, cupo
          y disponibilidad.
        </p>
      )}
      {error && (
        <p role="alert" className="text-accent-red">
          {error}
        </p>
      )}
      {uncertain && (
        <>
          <p>
            La operación está en curso o requiere revisión. Conserva este identificador; no crees
            otra matrícula.
          </p>
          <Button variant="secondary" onClick={onCheck}>
            Consultar estado de la operación
          </Button>
        </>
      )}
      {result?.emailStatus === "failed" && (
        <div>
          {result.studentCreated && (
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={regenerate}
                onChange={(e) => setRegenerate(e.target.checked)}
              />
              Regenerar y enviar contraseña temporal (invalida la anterior; solo si todavía no fue
              cambiada)
            </label>
          )}
          <p>
            Sin regenerar, el reenvío indica usar las credenciales actuales. No se guardan
            contraseñas para reenviarlas.
          </p>
          <Button variant="secondary" isLoading={busy} onClick={() => void onResend(regenerate)}>
            Reenviar correo de matrícula
          </Button>
        </div>
      )}
      {result ? (
        <Button onClick={onReset}>Matricular otro estudiante</Button>
      ) : (
        <div className="flex justify-between">
          <Button variant="secondary" disabled={busy || uncertain} onClick={onBack}>
            Atrás
          </Button>
          <Button isLoading={busy} disabled={uncertain} onClick={onConfirm}>
            Confirmar matrícula y prácticas
          </Button>
        </div>
      )}
    </div>
  );
}
