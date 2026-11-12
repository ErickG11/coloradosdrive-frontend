"use client";
import { useState } from "react";
import { Button, Card, Input, Select } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { CohortDetail, Cohort, Course } from "@/types";
import type { AdminReassignmentSource, BulkReassignmentResult } from "@/types/planChange";
import type { StudentScheduleSelection } from "@/types/studentSchedule";
import { SchedulePlanView } from "@/components/student-enrollment/SchedulePlanView";

type Row = StudentScheduleSelection & { cohortId: string; enrollmentId: string; updatedAt: string };
export function CohortReassignment({
  cohort,
  courses,
  onChanged,
}: {
  cohort: CohortDetail;
  courses: Course[];
  onChanged: () => void;
}) {
  const source = useFetch<AdminReassignmentSource>(`/cohorts/${cohort.id}/reasignacion`);
  const targets = useFetch<Cohort[]>("/cohorts");
  const limits = useFetch<{ endHour?: number }>("/admin/manual-enrollments/rules");
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{ key: string; data: BulkReassignmentResult } | null>(
    null,
  );
  const payload = { changes: Object.values(rows), motivo: reason.trim() },
    key = JSON.stringify(payload);
  function change(id: string, patch: Partial<Row>) {
    setRows((old) => ({ ...old, [id]: { ...old[id], ...patch } }));
  }
  async function send(apply: boolean) {
    if (!payload.changes.length || !reason.trim()) {
      setMessage("Selecciona matrículas y escribe el motivo.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const data = await api.post<BulkReassignmentResult>(
        `/cohorts/${cohort.id}/reasignacion/${apply ? "aplicar" : "preview"}`,
        payload,
        { signal: AbortSignal.timeout(30_000) },
      );
      if (apply) {
        setMessage(
          "Reasignación completa. Se conserva lo pagado; las nuevas fechas quedan en el historial y se notifican por correo.",
        );
        setRows({});
        setPreview(null);
        source.refetch();
        onChanged();
      } else setPreview({ key, data });
    } catch (error) {
      setPreview(null);
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo comprobar el resultado. Recarga antes de reintentar.",
      );
      source.refetch();
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!reason.trim()) {
      setMessage("Escribe el motivo de cancelación.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await api.post(`/cohorts/${cohort.id}/cancelar`, {
        updatedAt: cohort.updatedAt,
        motivo: reason.trim(),
      });
      setMessage("Cohorte cancelada.");
      onChanged();
      source.refetch();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo cancelar. Consulta el estado actual.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (source.data?.active === false) return null;
  if (source.error) return <p role="alert">{source.error}</p>;
  if (!source.data) return <p role="status">Consultando reasignaciones…</p>;
  const type = source.data.cohort?.type;
  const choices = targets.data?.filter(
    (c) =>
      c.id !== cohort.id &&
      courses.some((course) => course.id === c.courseId && course.tipo === type),
  );
  const proposal = preview?.key === key ? preview.data : null;
  return (
    <Card title="Reasignar o cancelar" className="mt-6">
      <p>
        Elige los alumnos y su destino del mismo tipo. La previsualización comprueba el grupo
        completo sin retener recursos. Al confirmar se vuelve a comprobar; un fallo conserva todos
        los planes originales. Se mantiene la ventana de 48 horas.
      </p>
      <fieldset className="mt-4 grid gap-4" disabled={busy}>
        <Input
          label="Motivo de reasignación o cancelación"
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
        />
        {source.data.enrollments?.map((e) => (
          <div key={e.id} className="grid gap-3 rounded-sm border p-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={!e.guardReady}
                checked={Boolean(rows[e.id])}
                onChange={(event) => {
                  if (event.target.checked)
                    setRows((old) => ({
                      ...old,
                      [e.id]: {
                        enrollmentId: e.id,
                        updatedAt: e.updatedAt,
                        cohortId: "",
                        modalidad: "entre_semana",
                        horasPorDia: 3,
                        horaInicio: 6,
                        fechaInicio: e.practiceStartDate ?? "",
                      },
                    }));
                  else
                    setRows((old) => {
                      const next = { ...old };
                      delete next[e.id];
                      return next;
                    });
                }}
              />
              {e.studentName} · {e.practiceStartDate ?? "Fechas pendientes"} —{" "}
              {e.practiceEndDate ?? "Revisión requerida"}
            </label>
            {!e.guardReady ? (
              <p>Debe resolverse la evidencia de fechas antes de reasignar.</p>
            ) : null}
            {rows[e.id] ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label={`Destino de ${e.studentName}`}
                  value={rows[e.id].cohortId}
                  onChange={(v) => change(e.id, { cohortId: v.target.value })}
                >
                  <option value="">Selecciona destino</option>
                  {choices?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} · {c.fechaInicioCurso} — {c.fechaFinCurso}
                    </option>
                  ))}
                </Select>
                <Input
                  label={`Inicio de ${e.studentName}`}
                  type="date"
                  value={rows[e.id].fechaInicio}
                  onChange={(v) => change(e.id, { fechaInicio: v.target.value })}
                />
                <Select
                  label={`Modalidad de ${e.studentName}`}
                  value={rows[e.id].modalidad}
                  onChange={(v) => change(e.id, { modalidad: v.target.value as Row["modalidad"] })}
                >
                  <option value="entre_semana">Entre semana</option>
                  <option value="fin_de_semana">Fin de semana</option>
                </Select>
                <Select
                  label={`Horas por día de ${e.studentName}`}
                  value={rows[e.id].horasPorDia}
                  onChange={(v) => change(e.id, { horasPorDia: Number(v.target.value) })}
                >
                  {[1, 2, 3, 4, 5, 6].map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
                <Input
                  label={`Hora inicial de ${e.studentName}`}
                  type="number"
                  min={6}
                  max={(limits.data?.endHour ?? 22) - rows[e.id].horasPorDia}
                  value={rows[e.id].horaInicio}
                  onChange={(v) => change(e.id, { horaInicio: Number(v.target.value) })}
                />
              </div>
            ) : null}
          </div>
        ))}
        {targets.error ? <p role="alert">{targets.error}</p> : null}
        <Button
          type="button"
          variant="secondary"
          disabled={
            !payload.changes.length ||
            !reason.trim() ||
            payload.changes.some((r) => !r.cohortId || !r.fechaInicio)
          }
          onClick={() => void send(false)}
        >
          Comprobar capacidad del grupo
        </Button>
        {proposal?.canApply ? (
          <>
            <p role="status">
              Todos los planes caben en esta consulta. La confirmación vuelve a validar capacidad y
              versiones.
            </p>
            {proposal.plans.map((p) => {
              const plan = p.reservation.plan;
              return plan ? (
                <div key={p.enrollmentId}>
                  <p>
                    {source.data?.enrollments?.find((e) => e.id === p.enrollmentId)?.studentName}
                  </p>
                  <SchedulePlanView days={plan.dias.map((d) => ({ ...d, ok: true }))} />
                </div>
              ) : null;
            })}
            <Button type="button" onClick={() => void send(true)}>
              Confirmar reasignación completa
            </Button>
          </>
        ) : null}
        <p>
          La cancelación queda bloqueada mientras haya matrículas o reservas que requieran
          reasignación o devolución documentada.
        </p>
        <Button
          type="button"
          variant="secondary"
          disabled={!reason.trim()}
          onClick={() => void cancel()}
        >
          Cancelar cohorte con motivo
        </Button>
      </fieldset>
      {message ? (
        <p role="status" className="mt-3">
          {message}
        </p>
      ) : null}
    </Card>
  );
}
