"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { contentErrorMessage } from "@/lib/utils/content";
import { useContentSuccess } from "./ContentFeedback";
export function useContentResource<T>(path: string | null) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    path: string | null;
    revision: number;
    data: T | null;
    error: string | null;
  }>({ path: null, revision: -1, data: null, error: null });
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api
      .get<T>(path, { signal: controller.signal, cache: "no-store" })
      .then((data) => {
        if (!controller.signal.aborted) setState({ path, revision, data, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({ path, revision, data: null, error: contentErrorMessage(error) });
      });
    return () => controller.abort();
  }, [path, revision]);
  const current = state.path === path && state.revision === revision;
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: Boolean(path) && !current,
    reload,
  };
}
export function useContentMutation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const notify = useContentSuccess();
  async function run<T>(
    task: () => Promise<T>,
    success: string | ((result: T) => string),
  ): Promise<{ ok: true; value: T } | { ok: false }> {
    if (lock.current) return { ok: false };
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const value = await task();
      const message = typeof success === "string" ? success : success(value);
      if (message) notify(message);
      return { ok: true, value };
    } catch (error: unknown) {
      setError(contentErrorMessage(error));
      return { ok: false };
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { busy, error, run, setError };
}
