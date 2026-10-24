"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { Cohort } from "@/types";

// Reuse the existing admin detail endpoint. Never turn a failed count into zero.
export function useCohortStudentCounts(cohorts: Cohort[] | null) {
  const [snapshot, setSnapshot] = useState<{
    source: Cohort[] | null;
    counts: Record<string, { total: number; activos: number } | null>;
  }>({ source: null, counts: {} });

  useEffect(() => {
    if (!cohorts) return;
    let cancelled = false;
    async function load() {
      const counts: Record<string, { total: number; activos: number } | null> = {};
      // Bound concurrency for large lists while avoiding one request per rendered variant.
      let next = 0;
      async function worker() {
        while (next < cohorts!.length && !cancelled) {
          const cohort = cohorts![next++];
          try {
            const detail = await api.get<{ alumnos: { total: number; activos: number } }>(
              `/cohorts/${cohort.id}`,
            );
            const total = detail.alumnos?.total;
            const activos = detail.alumnos?.activos;
            counts[cohort.id] =
              Number.isInteger(total) && total >= 0 && Number.isInteger(activos) && activos >= 0
                ? { total, activos }
                : null;
          } catch {
            counts[cohort.id] = null;
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(4, cohorts!.length) }, worker));
      if (!cancelled) setSnapshot({ source: cohorts, counts });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [cohorts]);

  return snapshot.source === cohorts ? snapshot.counts : {};
}
