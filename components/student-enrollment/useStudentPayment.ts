"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { studentPaymentApi, paymentError } from "@/lib/api/studentPayment";
import type { StudentPayment } from "@/types/studentPayment";
export function useStudentPayment(enrollmentId: string | null | undefined, onApproved: () => void) {
  const [payment, setPayment] = useState<StudentPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const approved = useRef<string | null>(null);
  const version = useRef(0);
  const accept = useCallback(
    (result: StudentPayment | null) => {
      if (result && result.enrollmentId !== enrollmentId) return;
      version.current++;
      setPayment(result);
      setError(null);
      setReady(true);
      if (result?.estado === "aprobado" && approved.current !== result.id) {
        approved.current = result.id;
        onApproved();
      }
    },
    [enrollmentId, onApproved],
  );
  useEffect(() => {
    if (!enrollmentId) return;
    let cancelled = false;
    let running = false;
    async function load() {
      if (running || document.hidden) return;
      running = true;
      const started = version.current;
      try {
        const data = await studentPaymentApi.current(enrollmentId!);
        if (!cancelled && version.current === started) accept(data.pago);
      } catch (err) {
        if (!cancelled && version.current === started) setError(paymentError(err));
      } finally {
        running = false;
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    const visible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [enrollmentId, accept, refreshKey]);
  const current = payment?.enrollmentId === enrollmentId ? payment : null;
  return { payment: current, error, ready, accept, refresh: () => setRefreshKey((v) => v + 1) };
}
