"use client";

import { useEffect, useState } from "react";
import { Button, FormError, Input, Select } from "@/components/ui";
import { formatCents, summarizePayment } from "./payment";
import { focusFirst, type ServerFieldError } from "./validation";
import {
  DOCUMENTS,
  EMPTY_DETAILS,
  type CourseSelection,
  type DocumentsPaymentChoice,
  type DocumentStatus,
  type StudentData,
} from "./wizardTypes";

export function StepDocumentosPago({
  student,
  course,
  value,
  onBack,
  onNext,
  serverError,
}: {
  student: StudentData;
  course: CourseSelection;
  value: DocumentsPaymentChoice | null;
  onBack: () => void;
  onNext: (value: DocumentsPaymentChoice) => void;
  /** Error del servidor al confirmar que corresponde a este paso. */
  serverError?: ServerFieldError | null;
}) {
  const [choice, setChoice] = useState<DocumentsPaymentChoice>(value ?? EMPTY_DETAILS);
  const summary = summarizePayment(course, choice.pago);
  // Los errores se muestran al pulsar «Continuar» y luego se mantienen al día.
  const [attempted, setAttempted] = useState(false);
  const [server, setServer] = useState<{ id: string; message: string } | null>(() =>
    serverError?.step === 4
      ? {
          id: serverError.field === "modalidad" ? "modalidadPago" : serverError.field,
          message: serverError.message,
        }
      : null,
  );
  useEffect(() => {
    if (server) focusFirst([server.id]);
    // Solo al llegar desde un error del servidor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shown = attempted ? summary.error : null;
  const fieldError = (id: string): string | undefined =>
    (shown && summary.errorField === id ? shown : undefined) ??
    (server?.id === id ? server.message : undefined);
  function setStatus(tipo: (typeof DOCUMENTS)[number]["tipo"], estado: DocumentStatus) {
    setChoice((current) => ({
      ...current,
      documentos: current.documentos.map((d) => (d.tipo === tipo ? { ...d, estado } : d)),
    }));
  }
  function setPayment(patch: Partial<DocumentsPaymentChoice["pago"]>) {
    setServer(null);
    setChoice((current) => ({ ...current, pago: { ...current.pago, ...patch } }));
  }
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-md border border-border p-4">
        <h2 className="font-bold">Documentos</h2>
        <p>Este checklist es informativo y no impide matricular.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {DOCUMENTS.map((document) => (
            <Select
              key={document.tipo}
              name={document.tipo}
              label={document.label}
              value={choice.documentos.find((d) => d.tipo === document.tipo)?.estado ?? "pendiente"}
              onChange={(event) => setStatus(document.tipo, event.target.value as DocumentStatus)}
            >
              <option value="pendiente">Pendiente</option>
              <option value="entregado">Entregado</option>
              <option value="no_aplica">No aplica</option>
            </Select>
          ))}
        </div>
        <p className="mt-3 text-sm">
          {student.mode === "existing"
            ? "La papeleta puede quedar como no aplica según la edad registrada del estudiante; el backend lo determinará."
            : "Si el estudiante tiene 65 años o más, el backend marcará la papeleta como no aplica según la fecha de nacimiento."}
        </p>
      </section>
      <section className="rounded-md border border-border p-4">
        <h2 className="font-bold">Pago inicial</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Select
            name="modalidadPago"
            label="Modalidad de pago"
            error={fieldError("modalidadPago")}
            value={course.cohortId ? choice.pago.modalidad : "abono"}
            onChange={(event) =>
              setPayment({ modalidad: event.target.value as "abono" | "completo" })
            }
          >
            <option value="abono">Abono</option>
            {course.cohortId && <option value="completo">Pago completo</option>}
          </Select>
          <Input
            name="descuento"
            label="Descuento (USD)"
            type="number"
            min="0"
            step="0.01"
            disabled={!course.cohortId}
            error={fieldError("descuento")}
            value={course.cohortId ? choice.pago.descuento : "0"}
            onChange={(event) => setPayment({ descuento: event.target.value })}
          />
          {choice.pago.modalidad === "abono" || !course.cohortId ? (
            <Input
              name="montoAbonado"
              label="Monto abonado (USD)"
              type="number"
              min="0"
              step="0.01"
              error={fieldError("montoAbonado")}
              value={choice.pago.montoAbonado}
              onChange={(event) => setPayment({ montoAbonado: event.target.value })}
            />
          ) : (
            <Input
              name="montoAbonado"
              label="Monto abonado (USD)"
              value={summary.netCents === null ? "" : formatCents(summary.netCents)}
              readOnly
            />
          )}
        </div>
        <div className="mt-4" aria-live="polite">
          <p>
            Precio:{" "}
            {summary.grossCents === null
              ? "Se calculará al asignar cohorte"
              : formatCents(summary.grossCents)}
          </p>
          <p>Descuento: {formatCents(summary.discountCents)}</p>
          <p>
            Neto:{" "}
            {summary.netCents === null
              ? "Se calculará al asignar cohorte"
              : formatCents(summary.netCents)}
          </p>
          <p>Abonado: {formatCents(summary.paidCents)}</p>
          <p>
            Saldo:{" "}
            {summary.balanceCents === null
              ? "Se calculará al asignar cohorte"
              : formatCents(summary.balanceCents)}
          </p>
        </div>
        {shown && summary.errorField === null && <FormError className="mt-2">{shown}</FormError>}
      </section>
      <div className="flex justify-between gap-3">
        <Button variant="secondary" onClick={onBack}>
          Atrás
        </Button>
        <Button
          onClick={() => {
            setAttempted(true);
            if (summary.error) {
              if (summary.errorField) focusFirst([summary.errorField]);
              return;
            }
            onNext({
              documentos: choice.documentos,
              pago: course.cohortId
                ? choice.pago
                : { ...choice.pago, modalidad: "abono", descuento: "0" },
            });
          }}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
