"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ownCatalog } from "@/lib/api/studentContent";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { serverTime } from "@/lib/utils/studentContent";
import type { ExamAttempt } from "@/types/examAttempt";
import { summarizeAttempts, type AttemptSummary } from "./dashboardModel";

type Context = Awaited<ReturnType<typeof ownCatalog>>;
export function useDashboardCatalog(courseId: string | null) {
  const [result, setResult] = useState<{
    id: string;
    context: Context | null;
    error: boolean;
    unavailable: boolean;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!courseId) return;
    const controller = new AbortController();
    let version = 0;
    const load = async () => {
      const current = ++version;
      try {
        const context = await ownCatalog(courseId, controller.signal);
        if (
          !controller.signal.aborted &&
          current === version &&
          context.catalog.course_id === courseId
        )
          setResult({ id: courseId, context, error: false, unavailable: false });
      } catch (error) {
        if (!controller.signal.aborted && current === version) {
          const unavailable = error instanceof ApiError && error.code === "ITEM_NOT_FOUND";
          setResult((previous) => ({
            id: courseId,
            context: unavailable ? null : previous?.id === courseId ? previous.context : null,
            error: !unavailable,
            unavailable,
          }));
        }
      }
    };
    void load();
    const visible = () => {
      if (!document.hidden) void load();
    };
    const interval = window.setInterval(visible, 60_000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
    };
  }, [courseId, revision]);
  const current = result?.id === courseId ? result : null;
  return {
    catalog: current?.context?.catalog ?? null,
    clock: current?.context?.clock ?? null,
    error: current?.error ?? false,
    loading: Boolean(courseId && !current),
    retry,
  };
}

export function useDashboardAttempts(examIds: string[]) {
  const key = [...new Set(examIds)].sort().join(",");
  const [result, setResult] = useState<{
    key: string;
    values: Record<string, AttemptSummary[]>;
    errors: string[];
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const ids = key ? key.split(",") : [];
    const controller = new AbortController();
    let version = 0;
    const collect = async () => {
      const requestVersion = ++version;
      const values: Record<string, AttemptSummary[]> = {},
        errors: string[] = [];
      for (let index = 0; index < ids.length; index += 3) {
        const batch = ids.slice(index, index + 3);
        const results = await Promise.allSettled(
          batch.map((id) =>
            api.get<ExamAttempt[]>(`/exams/${encodeURIComponent(id)}/attempts/me`, {
              signal: controller.signal,
              cache: "no-store",
            }),
          ),
        );
        if (controller.signal.aborted || requestVersion !== version) return;
        results.forEach((item, offset) => {
          if (item.status === "fulfilled") values[batch[offset]] = summarizeAttempts(item.value);
          else errors.push(batch[offset]);
        });
      }
      if (!controller.signal.aborted && requestVersion === version)
        setResult({ key, values, errors });
    };
    void collect();
    const visible = () => {
      if (!document.hidden) void collect();
    };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
    };
  }, [key, revision]);
  return {
    values: result?.key === key ? result.values : {},
    errors: result?.key === key ? result.errors : [],
    loading: Boolean(key && result?.key !== key),
    retry,
  };
}

export function useDashboardViewport() {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false),
    [visible, setVisible] = useState(false),
    [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setTabVisible(!document.hidden);
    const initial = window.setTimeout(update, 0);
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              setVisible(entry.isIntersecting);
              if (entry.isIntersecting) setSeen(true);
            },
            { rootMargin: "40px", threshold: 0 },
          );
    observer?.observe(element);
    const fallback = !observer
      ? window.setTimeout(() => {
          setSeen(true);
          setVisible(true);
        }, 0)
      : null;
    document.addEventListener("visibilitychange", update);
    return () => {
      observer?.disconnect();
      window.clearTimeout(initial);
      if (fallback !== null) window.clearTimeout(fallback);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return { ref, seen, running: visible && tabVisible };
}
export function dashboardNow(clock: Context["clock"] | null, fallback: number | null) {
  return clock && typeof performance !== "undefined"
    ? serverTime(clock, performance.now())
    : fallback;
}
