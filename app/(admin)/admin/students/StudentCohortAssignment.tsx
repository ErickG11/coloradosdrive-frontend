"use client";

import { useRef, useState } from "react";
import { Button, Modal, Select } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { ApiError } from "@/lib/api/errors";
import {
  assignStudentCohort,
  studentCohortAmounts,
  studentCohortError,
  studentCohortPath,
} from "@/lib/api/studentCohort";
import { formatMoney } from "@/lib/utils/money";
import type { StudentEnrollment } from "@/types/student";
import type { StudentCohortOptions } from "@/types/studentCohort";

interface Props {
  studentId: string;
  enrollment: StudentEnrollment;
  onClose: () => void;
  onSaved: () => void;
  onReload: () => void;
  onDeletionPending: () => void;
}
const money = formatMoney;
const civil = (date: string) => date.split("-").reverse().join("/");

export function StudentCohortAssignment({
  studentId,
  enrollment,
  onClose,
  onSaved,
  onReload,
  onDeletionPending,
}: Props) {
  const { data, isLoading, error, errorStatus, errorCode, refetch } =
    useFetch<StudentCohortOptions>(
      `${studentCohortPath(studentId, enrollment.enrollmentId)}/cohortes`,
    );
  const [selection, setSelection] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [failure, setFailure] = useState<ReturnType<typeof studentCohortError> | null>(null);
  const selectedId = selection ?? data?.suggestion.cohortId ?? "";
  const chosen = data?.items.find((c) => c.id === selectedId);
  const amounts = chosen
    ? studentCohortAmounts(chosen.precio, enrollment.descuento, enrollment.montoAbonado)
    : null;
  const suggestion = data?.items.find((c) => c.id === data.suggestion.cohortId);
  const readFailure = error
    ? studentCohortError(new ApiError(error, errorStatus ?? 500, { code: errorCode ?? undefined }))
    : null;

  function close() {
    if (submitting.current) return;
    if (readFailure?.deletionPending) onDeletionPending();
    if (failure?.blocked || readFailure?.blocked) onReload();
    else onClose();
  }
  function reload() {
    if (submitting.current) return;
    if (readFailure?.deletionPending) onDeletionPending();
    onReload();
  }

  function refresh() {
    if (submitting.current) return;
    setSelection("");
    refetch();
  }
  async function save() {
    if (
      submitting.current ||
      isLoading ||
      error ||
      !chosen ||
      amounts?.abonoExcedeNeto ||
      failure?.blocked
    )
      return;
    submitting.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await assignStudentCohort(studentId, enrollment.enrollmentId, chosen.id);
      onSaved();
    } catch (err) {
      const result = studentCohortError(err);
      setFailure(result);
      if (result.deletionPending) onDeletionPending();
      if (result.refreshOptions) {
        setSelection("");
        refetch();
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal isOpen title="Asignar cohorte" onClose={close}>
      <div className="flex flex-col gap-4 text-sm text-text-primary">
        <p>
          {enrollment.curso?.nombre ?? "Curso"} · Tipo {enrollment.courseType}
        </p>
        <p className="text-text-secondary">
          Se actualizará esta matrícula. Las prácticas se gestionan por separado.
        </p>
        {failure && (
          <p role="alert" className="text-accent-red">
            {failure.message}
          </p>
        )}
        {isLoading ? (
          <p role="status">Cargando cohortes…</p>
        ) : readFailure ? (
          <div role="alert" className="flex flex-col gap-3 text-accent-red">
            <p>{readFailure.message}</p>
            <Button variant="secondary" onClick={refresh}>
              Actualizar opciones
            </Button>
          </div>
        ) : data?.items.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p>No hay cohortes con matrícula abierta y cupo para este curso.</p>
            <Button variant="secondary" onClick={refresh}>
              Actualizar opciones
            </Button>
          </div>
        ) : data ? (
          <>
            <p>
              Sugerencia:{" "}
              {suggestion ? (suggestion.nombre ?? "Cohorte sin nombre") : "Sin sugerencia"}
            </p>
            {data.suggestion.warning === "matricula_por_cerrar" && (
              <p>La matrícula de la cohorte sugerida está por cerrar.</p>
            )}
            <Select
              id="student-cohort"
              label="Cohorte"
              value={chosen?.id ?? ""}
              disabled={busy || failure?.blocked}
              onChange={(event) => {
                setSelection(event.target.value);
                if (!failure?.blocked) setFailure(null);
              }}
            >
              <option value="">Selecciona una cohorte</option>
              {data.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre ?? "Cohorte"} · {civil(c.fechaInicioMatricula)}–
                  {civil(c.fechaFinMatricula)} · {c.cuposDisponibles} cupos · {money(c.precio)}
                </option>
              ))}
            </Select>
            {chosen && amounts && (
              <>
                <p>
                  Ventana de matrícula: {civil(chosen.fechaInicioMatricula)} al{" "}
                  {civil(chosen.fechaFinMatricula)}. Inicio del curso:{" "}
                  {civil(chosen.fechaInicioCurso)}.
                </p>
                <p>Cupos disponibles: {chosen.cuposDisponibles}</p>
                <dl className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["Precio", chosen.precio],
                      ["Descuento", enrollment.descuento],
                      ["Neto", amounts.neto],
                      ["Abono", enrollment.montoAbonado],
                      ["Saldo", amounts.saldo],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-text-secondary">{label}</dt>
                      <dd>{money(value)}</dd>
                    </div>
                  ))}
                </dl>
                {amounts.abonoExcedeNeto && (
                  <p role="alert" className="text-accent-red">
                    El abono supera el neto de esta cohorte. Selecciona otra opción.
                  </p>
                )}
              </>
            )}
            <p className="text-text-secondary">Precio y cupo se vuelven a validar al confirmar.</p>
            <Button variant="secondary" disabled={busy || failure?.blocked} onClick={refresh}>
              Actualizar opciones
            </Button>
          </>
        ) : null}
        {(failure || readFailure?.blocked) && (
          <Button variant="secondary" disabled={busy} onClick={reload}>
            Recargar ficha
          </Button>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" disabled={busy} onClick={close}>
            Cancelar
          </Button>
          <Button
            disabled={
              busy ||
              isLoading ||
              !!error ||
              !chosen ||
              amounts?.abonoExcedeNeto ||
              failure?.blocked
            }
            onClick={() => void save()}
          >
            {busy ? "Asignando…" : "Confirmar asignación"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
