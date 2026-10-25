"use client";
import styles from "./enrollment.module.css";
import { WizardIcon } from "./WizardVisual";

import { useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import { formatCents, summarizePayment } from "./payment";
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
}: {
  student: StudentData;
  course: CourseSelection;
  value: DocumentsPaymentChoice | null;
  onBack: () => void;
  onNext: (value: DocumentsPaymentChoice) => void;
}) {
  const [choice, setChoice] = useState<DocumentsPaymentChoice>(value ?? EMPTY_DETAILS);
  const summary = summarizePayment(course, choice.pago);
  function setStatus(tipo: (typeof DOCUMENTS)[number]["tipo"], estado: DocumentStatus) {
    setChoice((current) => ({
      ...current,
      documentos: current.documentos.map((d) => (d.tipo === tipo ? { ...d, estado } : d)),
    }));
  }
  function setPayment(patch: Partial<DocumentsPaymentChoice["pago"]>) {
    setChoice((current) => ({ ...current, pago: { ...current.pago, ...patch } }));
  }
  return (
    <div className={styles.documentsPayment}>
      <section className={styles.documentSection}>
        <h3>
          <WizardIcon name="document" />
          Documentos
        </h3>
        <p>Este checklist es informativo y no impide matricular.</p>
        <div className={styles.documentFields}>
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
      <section className={styles.paymentSection}>
        <h3>
          <WizardIcon name="money" />
          Pago inicial
        </h3>
        <div className={styles.paymentFields}>
          <Select
            name="modalidadPago"
            label="Modalidad de pago"
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
        <div className={styles.moneySummary} aria-live="polite">
          <p>
            <span>Precio:</span>
            <strong>
              {summary.grossCents === null
                ? "Se calculará al asignar cohorte"
                : formatCents(summary.grossCents)}
            </strong>
          </p>
          <p>
            <span>Descuento:</span>
            <strong>{formatCents(summary.discountCents)}</strong>
          </p>
          <p>
            <span>Neto:</span>
            <strong>
              {summary.netCents === null
                ? "Se calculará al asignar cohorte"
                : formatCents(summary.netCents)}
            </strong>
          </p>
          <p>
            <span>Abonado:</span>
            <strong>{formatCents(summary.paidCents)}</strong>
          </p>
          <p>
            <span>Saldo:</span>
            <strong>
              {summary.balanceCents === null
                ? "Se calculará al asignar cohorte"
                : formatCents(summary.balanceCents)}
            </strong>
          </p>
        </div>
        {summary.error && (
          <p role="alert" className="mt-2 text-accent-red">
            {summary.error}
          </p>
        )}
      </section>
      <div className={styles.footer}>
        <Button variant="secondary" onClick={onBack}>
          Atrás
        </Button>
        <Button
          disabled={!!summary.error}
          onClick={() =>
            onNext({
              documentos: choice.documentos,
              pago: course.cohortId
                ? choice.pago
                : { ...choice.pago, modalidad: "abono", descuento: "0" },
            })
          }
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
