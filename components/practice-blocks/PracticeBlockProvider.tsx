"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api/client";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import type { PracticeBlockOption, PracticeBlockSummary } from "@/types/practiceBlock";

interface Availability {
  summary: PracticeBlockSummary | null;
  options: PracticeBlockOption[];
  loading: boolean;
  summaryError: string | null;
  optionsError: string | null;
  refresh: () => Promise<void>;
}
const Context = createContext<Availability | null>(null);
const message = (e: unknown) =>
  e instanceof Error ? e.message : "No pudimos actualizar tus prácticas. Intenta de nuevo.";
export function PracticeBlockProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [summary, setSummary] = useState<PracticeBlockSummary | null>(null);
  const [options, setOptions] = useState<PracticeBlockOption[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const active = useRef(false);
  const version = useRef(0);
  const load = useCallback(async () => {
    if (!enabled) return;
    const request = ++version.current;
    const current = () => active.current && request === version.current;
    await Promise.allSettled([
      api.get<PracticeBlockSummary>("/practice-slots/blocks/summary").then(
        (value) => {
          if (current()) {
            setSummary(value);
            setSummaryError(null);
          }
        },
        (error: unknown) => {
          if (current()) setSummaryError(message(error));
        },
      ),
      api.get<PracticeBlockOption[]>("/practice-slots/blocks/options").then(
        (value) => {
          if (current()) {
            setOptions(value);
            setOptionsError(null);
          }
        },
        (error: unknown) => {
          if (current()) {
            setOptions([]);
            setOptionsError(message(error));
          }
        },
      ),
    ]);
    if (current()) setLoading(false);
  }, [enabled]);
  // Las recargas posteriores muestran el estado de carga; la primera ya nace cargando.
  const refresh = useCallback(async () => {
    if (enabled) setLoading(true);
    await load();
  }, [enabled, load]);
  const stop = useCallback(() => {
    active.current = false;
    version.current++;
  }, []);
  useEffect(() => {
    active.current = true;
    void load();
    const focus = () => {
      void refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      stop();
      window.removeEventListener("focus", focus);
    };
  }, [load, refresh, stop]);
  const cohorts = [...new Set(summary?.enrollments.map((e) => e.cohortId) ?? [])].sort();
  const handlers = {
    "blocks-updated": () => {
      void refresh();
    },
    "slot-released": () => {
      void refresh();
    },
    "slot-taken": () => {
      void refresh();
    },
  };
  useRealtimeChannel(
    enabled && cohorts[0] ? `cohort-${cohorts[0]}-practice-slots` : null,
    handlers,
  );
  useRealtimeChannel(
    enabled && cohorts[1] ? `cohort-${cohorts[1]}-practice-slots` : null,
    handlers,
  );
  return (
    <Context.Provider value={{ summary, options, loading, summaryError, optionsError, refresh }}>
      {children}
    </Context.Provider>
  );
}
export function usePracticeBlocks() {
  const value = useContext(Context);
  if (!value) throw new Error("Falta el contexto de prácticas");
  return value;
}
