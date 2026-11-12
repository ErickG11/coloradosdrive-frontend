"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { studentScheduleApi, scheduleError } from "@/lib/api/studentSchedule";
import type {
  StudentScheduleReservation,
  StudentReservationSnapshot,
} from "@/types/studentSchedule";
interface ClockSnapshot extends StudentReservationSnapshot {
  scope?: string;
  receivedAt: number;
  serverMs: number;
}
export function useStudentReservation(onClosed: () => void, enrollmentId?: string) {
  const [snapshot, setSnapshot] = useState<ClockSnapshot | null>(null);
  const [monotonicNow, setMonotonicNow] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"ampliar" | "liberar" | null>(null);
  const [checking, setChecking] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const closed = useRef<string | null>(null);
  const mutation = useRef(false);
  const version = useRef(0);
  const refetch = useCallback(() => setRefreshKey((v) => v + 1), []);
  const accept = useCallback(
    (data: StudentReservationSnapshot) => {
      const serverMs = Date.parse(data.serverNow);
      if (!Number.isFinite(serverMs)) throw new Error("invalid_server_clock");
      const receivedAt = performance.now();
      setMonotonicNow(receivedAt);
      setSnapshot({ ...data, scope: enrollmentId, receivedAt, serverMs });
      setError(null);
      if (
        data.reserva &&
        ["vencida", "liberada"].includes(data.reserva.estado) &&
        closed.current !== data.reserva.id
      ) {
        closed.current = data.reserva.id;
        onClosed();
      }
    },
    [onClosed, enrollmentId],
  );

  useEffect(() => {
    let cancelled = false;
    let loading = false;
    async function refresh() {
      if (loading || document.hidden || mutation.current) return;
      const startedVersion = version.current;
      loading = true;
      setChecking(true);
      try {
        const data = await studentScheduleApi.current(enrollmentId);
        if (!cancelled && startedVersion === version.current) accept(data);
      } catch (err) {
        if (!cancelled && startedVersion === version.current) setError(scheduleError(err));
      } finally {
        loading = false;
        if (!cancelled) setChecking(false);
      }
    }
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 30_000);
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", visible);
    };
  }, [accept, refreshKey, enrollmentId]);
  useEffect(() => {
    const timer = window.setInterval(() => setMonotonicNow(performance.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  // Reloj monotónico: cambiar la hora del equipo no prolonga el contador.
  const currentSnapshot = snapshot?.scope === enrollmentId ? snapshot : null;
  const elapsed = currentSnapshot ? Math.max(0, monotonicNow - currentSnapshot.receivedAt) : 0;
  const remaining = currentSnapshot?.reserva
    ? Math.max(
        0,
        Math.ceil(
          (Date.parse(currentSnapshot.reserva.expiraAt) - currentSnapshot.serverMs - elapsed) /
            1000,
        ),
      )
    : 0;
  const reservation = currentSnapshot?.reserva ?? null;
  const held = reservation?.estado === "vigente" || reservation?.estado === "pago_en_curso";
  const live = reservation?.estado === "pago_en_curso" || (held && remaining > 0);
  useEffect(() => {
    if (!held || reservation?.estado === "pago_en_curso" || remaining > 0) return;
    // Cero local pide confirmación al servidor. No libera ni concede acceso local.
    const timer = window.setTimeout(refetch, 100);
    return () => window.clearTimeout(timer);
  }, [held, remaining, refetch, reservation?.estado]);

  async function change(next: "ampliar" | "liberar") {
    if (!reservation || action || mutation.current) return;
    mutation.current = true;
    version.current++;
    setAction(next);
    try {
      accept(await studentScheduleApi.change(reservation.id, next));
    } catch (err) {
      setError(scheduleError(err));
      refetch();
    } finally {
      mutation.current = false;
      setAction(null);
    }
  }
  function reserved(data: StudentScheduleReservation) {
    version.current++;
    accept({ reserva: data, serverNow: data.serverNow });
  }
  return {
    reservation,
    remaining,
    live,
    held,
    error,
    checking,
    ready: currentSnapshot !== null,
    action,
    change,
    reserved,
    refetch,
  };
}
