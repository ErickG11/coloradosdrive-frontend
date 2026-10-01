"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import { formatCents, summarizePayment } from "./payment";
import {
  DOCUMENTS,
  type StudentData,
  type CourseSelection,
  type PracticeChoice,
  type ManualResult,
  type DocumentsPaymentChoice,
  type ManualEnrollmentDetails,
} from "./wizardTypes";
export function StepConfirmar({
  student,
  course,
  practice,
  choice,
  details,
  detailsLoading,
  detailsError,
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
  choice: DocumentsPaymentChoice;
  details: ManualEnrollmentDetails | null;
  detailsLoading: boolean;
  detailsError: string | null;
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
  const payment = summarizePayment(course, choice.pago);
  const documents = details?.documentos ?? choice.documentos;
  const pendingDocuments = details?.documentosPendientes ?? result?.documentosPendientes;
  const resultBalance = details?.saldo !== undefined ? details.saldo : result?.saldo;
  const money = (amount: number) => formatCents(Math.round(amount * 100));
  const displayAmount = (amount: number | null | undefined) =>
    amount === null
      ? "Se calculará al asignar cohorte"
      : amount === undefined
        ? "Actualizando…"
        : money(amount);
  const gross = result
    ? details?.precioBruto
    : payment.grossCents === null
      ? null
      : payment.grossCents / 100;
  const discount = result ? (details?.descuento ?? result.descuento) : payment.discountCents / 100;
  const net = result
    ? (details?.montoTotal ?? result.montoTotal)
    : payment.netCents === null
      ? null
      : payment.netCents / 100;
  const paid = result ? (details?.montoAbonado ?? result.montoAbonado) : payment.paidCents / 100;
  const balance = result
    ? resultBalance
    : payment.balanceCents === null
      ? null
      : payment.balanceCents / 100;
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
        <div className="mt-4 border-t border-border pt-3">
          <h3 className="font-semibold">Documentos</h3>
          <ul className="list-inside list-disc">
            {DOCUMENTS.map((document) => (
              <li key={document.tipo}>
                {document.label}:{" "}
                {documents.find((item) => item.tipo === document.tipo)?.estado.replace("_", " ") ??
                  "pendiente"}
              </li>
            ))}
          </ul>
          {result && pendingDocuments !== undefined && (
            <p>Documentos pendientes: {pendingDocuments}</p>
          )}
          {!result && (
            <p className="text-sm">
              El backend determinará si la papeleta no aplica según la edad del estudiante.
            </p>
          )}
          {detailsLoading && <p>Actualizando documentos y pago…</p>}
          {detailsError && (
            <p role="alert" className="text-accent-red">
              {detailsError}
            </p>
          )}
        </div>
        <div className="mt-4 border-t border-border pt-3">
          <h3 className="font-semibold">Pago inicial</h3>
          <p>Modalidad: {choice.pago.modalidad === "completo" ? "Pago completo" : "Abono"}</p>
          <p>Precio: {displayAmount(gross)}</p>
          <p>Descuento: {displayAmount(discount)}</p>
          <p>Neto: {displayAmount(net)}</p>
          <p>Abonado: {displayAmount(paid)}</p>
          <p>Saldo: {displayAmount(balance)}</p>
        </div>
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
            Las cuentas nuevas con contraseña temporal pendiente requieren regenerarla
            explícitamente. Las cuentas existentes conservan sus credenciales. No se guardan
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
