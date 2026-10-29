"use client";

import { useEffect, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { PendingPracticeRating, PendingPracticeRatingsPage } from "@/types/practiceRating";

const pageSize = 100;
const path = (page: number) =>
  `/estudiantes/practice-ratings/pending?page=${page}&pageSize=${pageSize}`;

// La API limita cada página a 100. Cargamos todas antes de ofrecer acciones en el historial.
export function usePendingPracticeRatings() {
  const first = useFetch<PendingPracticeRatingsPage>(path(1));
  const refetch = first.refetch;
  const [remaining, setRemaining] = useState<{
    first: PendingPracticeRatingsPage;
    items: PendingPracticeRating[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    window.addEventListener("focus", refetch);
    const timer = window.setInterval(refetch, 60_000);
    return () => {
      window.removeEventListener("focus", refetch);
      window.clearInterval(timer);
    };
  }, [refetch]);

  useEffect(() => {
    const base = first.data;
    if (!base || first.isLoading || first.error || base.total <= pageSize) return;
    const controller = new AbortController();
    const pages = Math.ceil(base.total / pageSize);
    void Promise.all(
      Array.from({ length: pages - 1 }, (_, index) =>
        api.get<PendingPracticeRatingsPage>(path(index + 2), { signal: controller.signal }),
      ),
    )
      .then((results) => {
        if (!controller.signal.aborted) {
          setRemaining({ first: base, items: results.flatMap((page) => page.items), error: null });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRemaining({
            first: base,
            items: [],
            error: "No se pudieron cargar todas tus encuestas.",
          });
        }
      });
    return () => controller.abort();
  }, [first.data, first.isLoading, first.error]);

  const needsMore = (first.data?.total ?? 0) > pageSize;
  const complete = !needsMore || remaining?.first === first.data;
  const error = first.error ?? (complete ? remaining?.error : null) ?? null;
  return {
    items:
      !first.isLoading && !error && complete && first.data
        ? [...first.data.items, ...(needsMore ? (remaining?.items ?? []) : [])]
        : [],
    isLoading: first.isLoading || (!first.error && !complete),
    error,
    refetch,
  };
}
