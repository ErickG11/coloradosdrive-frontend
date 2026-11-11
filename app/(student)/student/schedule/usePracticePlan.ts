"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { PracticeHistoryPage } from "@/types/practiceAttendance";

export function usePracticePlan(enrollmentId: string | null, revision: unknown, reload: number) {
  const [result, setResult] = useState<{
    id: string;
    data?: PracticeHistoryPage;
    error?: string;
  } | null>(null);
  useEffect(() => {
    if (!enrollmentId) return;
    let active = true;
    api
      .get<PracticeHistoryPage>(
        `/estudiantes/practice-history?enrollmentId=${encodeURIComponent(enrollmentId)}&page=1&pageSize=100`,
      )
      .then((data) => {
        if (active) setResult({ id: enrollmentId, data });
      })
      .catch(() => {
        if (active)
          setResult({ id: enrollmentId, error: "No pudimos cargar el avance de tu plan." });
      });
    return () => {
      active = false;
    };
  }, [enrollmentId, revision, reload]);
  return result?.id === enrollmentId ? result : null;
}
