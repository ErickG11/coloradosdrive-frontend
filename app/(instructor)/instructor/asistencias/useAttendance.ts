"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { attendanceError, correctionDeadline } from "@/lib/utils/practiceAttendance";
import {
  readBlocks,
  slotEnd,
  type AgendaSlot,
  type BlockDefinition,
} from "../_lib/instructorAgenda";
import type { PracticeSlot } from "@/types";

export const registrable = (s: AgendaSlot, now: number) =>
  s.studentId !== null && s.status === "completado" && slotEnd(s) <= now;
export const correctable = (s: AgendaSlot, now: number) =>
  registrable(s, now) &&
  s.attended !== null &&
  now <= correctionDeadline(s.scheduledAt, s.durationMinutes);
export type Failure = {
  slot: AgendaSlot;
  attended: boolean;
  motivo?: string;
  uncertain: boolean;
  message: string;
};
export function useAttendance(from: string, to: string, valid: boolean) {
  const [slots, setSlots] = useState<AgendaSlot[]>([]);
  const [definitions, setDefinitions] = useState<BlockDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [blocksFailed, setBlocksFailed] = useState(false);
  const [failures, setFailures] = useState<Record<string, Failure>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const generation = useRef(0);
  const path = valid
    ? `/practice-slots?${new URLSearchParams({ from: `${from}T00:00:00-05:00`, to: `${new Date(Date.parse(`${to}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)}T00:00:00-05:00` })}`
    : "";
  const load = useCallback(async () => {
    if (!valid || lock.current) return;
    const version = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const [rows, groups] = await Promise.all([
        api.get<AgendaSlot[]>(path),
        api
          .get<unknown>(
            `/practice-slots/blocks/instructor-groups?${new URLSearchParams({ from, to })}`,
          )
          .then(readBlocks, () => null),
      ]);
      if (version !== generation.current || lock.current) return;
      setSlots(rows);
      setDefinitions(groups ?? []);
      setBlocksFailed(groups === null);
    } catch (cause) {
      if (version === generation.current)
        setError(cause instanceof Error ? cause.message : "No se pudo cargar las asistencias.");
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [path, from, to, valid]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  useEffect(() => {
    const refresh = () => {
      void load();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("practice-notifications-updated", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("practice-notifications-updated", refresh);
    };
  }, [load]);
  const update = (slot: AgendaSlot | PracticeSlot) =>
    setSlots((rows) => rows.map((row) => (row.id === slot.id ? { ...row, ...slot } : row)));

  async function run(targets: AgendaSlot[], attended: boolean, motivo?: string, reconcile = false) {
    if (lock.current) return;
    lock.current = true;
    generation.current++;
    setLoading(false);
    setBusy(true);
    setMessage("");
    let saved = 0,
      failed = 0;
    for (const original of targets) {
      let current = original;
      let uncertain = reconcile;
      try {
        if (reconcile) {
          const fresh = (await api.get<AgendaSlot[]>(path)).find((row) => row.id === original.id);
          if (!fresh) throw new Error("La hora ya no está disponible. Actualiza el rango.");
          current = fresh;
          update(fresh);
          uncertain = false;
          if (fresh.attended === attended) {
            saved++;
            setFailures((old) => {
              const next = { ...old };
              delete next[original.id];
              return next;
            });
            continue;
          }
          if (fresh.attended !== original.attended)
            throw new Error("El registro cambió. Actualiza y utiliza una corrección con motivo.");
        }
        if (!registrable(current, Date.now())) throw new Error("Esta hora aún no está completada.");
        if (current.attended !== null && !motivo)
          throw new Error("Esta hora necesita una corrección con motivo.");
        if (motivo && !correctable(current, Date.now()))
          throw new Error("Pide la corrección al administrador");
        if (current.attended === attended) continue;
        update({ ...current, attended });
        try {
          const result = await api.patch<PracticeSlot>(`/practice-slots/${current.id}/attendance`, {
            attended,
            ...(motivo ? { motivo } : {}),
          });
          update(result);
        } catch (cause) {
          update(current);
          uncertain =
            !(cause instanceof ApiError) ||
            cause.status >= 500 ||
            cause.code === "ATTENDANCE_ALREADY_REGISTERED";
          if (uncertain) {
            const fresh = (await api.get<AgendaSlot[]>(path)).find((row) => row.id === current.id);
            if (!fresh)
              throw new Error("No se pudo verificar esta hora. Reconsulta antes de reintentar.");
            update(fresh);
            uncertain = false;
            if (fresh.attended !== attended) throw cause;
          } else throw cause;
        }
        saved++;
        setFailures((old) => {
          const next = { ...old };
          delete next[current.id];
          return next;
        });
      } catch (cause) {
        failed++;
        setFailures((old) => ({
          ...old,
          [current.id]: {
            slot: current,
            attended,
            motivo,
            uncertain,
            message: uncertain
              ? "Resultado sin confirmar. Debes reconsultar antes de reintentar."
              : cause instanceof ApiError
                ? attendanceError(cause)
                : cause instanceof Error
                  ? cause.message
                  : "No se pudo guardar esta hora.",
          },
        }));
      }
    }
    lock.current = false;
    setBusy(false);
    setMessage(
      `${saved} hora(s) guardada(s); ${failed} hora(s) sin guardar. Revisa el resultado de cada hora.`,
    );
  }
  return { slots, definitions, loading, error, blocksFailed, failures, busy, message, load, run };
}
