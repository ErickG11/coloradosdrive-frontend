"use client";
import { useEffect, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { PracticeHistoryPage } from "@/types/practiceAttendance";

const path = (id: string, page: number) =>
  `/estudiantes/practice-history?enrollmentId=${encodeURIComponent(id)}&page=${page}&pageSize=100`;
export function useHistoryData(enrollmentId: string) {
  const first = useFetch<PracticeHistoryPage>(path(enrollmentId, 1));
  const [snapshot, setSnapshot] = useState<{
    base: PracticeHistoryPage;
    data: PracticeHistoryPage;
    complete: boolean;
    error: string | null;
    updatedAt: number;
  } | null>(null);
  useEffect(() => {
    const base = first.data;
    if (!base || first.isLoading || first.error || base.enrollmentId !== enrollmentId) return;
    const controller = new AbortController();
    async function collect() {
      try {
        const items = [...base!.items];
        const pageCount = Math.ceil(base!.total / 100);
        for (let page = 2; page <= pageCount; page += 4) {
          const results = await Promise.all(
            Array.from({ length: Math.min(4, pageCount - page + 1) }, (_, index) =>
              api.get<PracticeHistoryPage>(path(enrollmentId, page + index), {
                signal: controller.signal,
              }),
            ),
          );
          for (const result of results) {
            if (result.enrollmentId !== enrollmentId || result.total !== base!.total)
              throw new Error("El historial cambió durante la consulta.");
            items.push(...result.items);
          }
        }
        const unique = [...new Map(items.map((item) => [item.id, item])).values()];
        if (unique.length !== base!.total)
          throw new Error("El historial cambió durante la consulta.");
        if (!controller.signal.aborted)
          setSnapshot({
            base: base!,
            data: { ...base!, items: unique },
            complete: true,
            error: null,
            updatedAt: Date.now(),
          });
      } catch {
        if (!controller.signal.aborted)
          setSnapshot((previous) => ({
            base: base!,
            data: previous?.data ?? base!,
            complete: previous?.complete ?? false,
            error: "No pudimos completar la actualización. Reintenta para ver todas tus prácticas.",
            updatedAt: previous?.updatedAt ?? Date.now(),
          }));
      }
    }
    void collect();
    return () => controller.abort();
  }, [first.data, first.isLoading, first.error, enrollmentId]);
  return {
    data: snapshot?.data ?? null,
    complete: snapshot?.complete ?? false,
    isLoading:
      first.isLoading || Boolean(first.data && snapshot?.base !== first.data && !first.error),
    error: first.error ? "No pudimos actualizar tu historial." : (snapshot?.error ?? null),
    errorStatus: first.errorStatus,
    updatedAt: snapshot?.updatedAt ?? null,
    refetch: first.refetch,
  };
}
