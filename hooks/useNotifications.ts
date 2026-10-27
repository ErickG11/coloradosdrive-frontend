"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Notification, NotificationsPage } from "@/types/notification";

const PAGE_SIZE = 20;

function errorMessage(error: unknown, action = false): string {
  if (error instanceof ApiError) {
    if (error.status === 401)
      return "Tu sesión venció. Vuelve a iniciar sesión para ver tus avisos.";
    if (error.status === 403) return "Tu cuenta no tiene acceso a estos avisos.";
    if (action && error.status === 404)
      return "Este aviso ya no está disponible. Actualiza la bandeja.";
  }
  return action
    ? "No se pudo marcar como leído. Inténtalo de nuevo."
    : "No pudimos consultar tus avisos. Inténtalo de nuevo.";
}

function unique(items: Notification[]): Notification[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export function useNotifications() {
  const [data, setData] = useState<NotificationsPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const page = useRef(1);
  const initialized = useRef(false);
  const request = useRef(0);
  const active = useRef(false);
  const mutating = useRef(false);
  const listController = useRef<AbortController | null>(null);
  const actionController = useRef<AbortController | null>(null);
  const failedLoad = useRef({ page: 1, append: false });

  const load = useCallback(async (lastPage: number, append = false) => {
    if (mutating.current) return;
    const version = ++request.current;
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;
    setIsLoading(!initialized.current);
    setIsLoadingMore(append);
    setError(null);
    try {
      // Al actualizar se conservan todas las paginas que el usuario ya abrio.
      const pages = append ? [lastPage] : Array.from({ length: lastPage }, (_, i) => i + 1);
      const results = await Promise.all(
        pages.map((current) =>
          api.get<NotificationsPage>(`/notifications?page=${current}&pageSize=${PAGE_SIZE}`, {
            signal: controller.signal,
          }),
        ),
      );
      if (!active.current || version !== request.current) return;
      page.current = lastPage;
      initialized.current = true;
      const first = results[0];
      setData((previous) => ({
        ...first,
        page: lastPage,
        items: unique([
          ...(append ? (previous?.items ?? []) : []),
          ...results.flatMap((result) => result.items),
        ]),
      }));
    } catch (failure) {
      if (!active.current || controller.signal.aborted || version !== request.current) return;
      failedLoad.current = { page: lastPage, append };
      setError(errorMessage(failure));
    } finally {
      if (active.current && version === request.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, []);

  const refresh = useCallback(() => load(page.current), [load]);
  useEffect(() => {
    active.current = true;
    void refresh();
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(onFocus, 60_000);
    return () => {
      active.current = false;
      request.current += 1;
      listController.current?.abort();
      actionController.current?.abort();
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [refresh]);

  async function markRead(notification?: Notification): Promise<boolean> {
    if (mutating.current) return false;
    if (notification?.readAt) return true;
    mutating.current = true;
    request.current += 1;
    listController.current?.abort();
    const controller = new AbortController();
    actionController.current = controller;
    setIsLoading(false);
    setIsLoadingMore(false);
    setPendingId(notification?.id ?? "all");
    setActionError(null);
    let missing = false;
    try {
      if (notification) {
        const updated = await api.patch<Notification>(
          `/notifications/${notification.id}/read`,
          undefined,
          { signal: controller.signal },
        );
        if (!active.current) return false;
        setData((previous) => {
          if (!previous) return previous;
          const wasUnread = previous.items.some((item) => item.id === updated.id && !item.readAt);
          return {
            ...previous,
            items: previous.items.map((item) => (item.id === updated.id ? updated : item)),
            unreadCount: Math.max(0, previous.unreadCount - (wasUnread && updated.readAt ? 1 : 0)),
          };
        });
      } else {
        await api.post<{ updatedCount: number }>("/notifications/read-all", undefined, {
          signal: controller.signal,
        });
        if (!active.current) return false;
        const readAt = new Date().toISOString();
        setData((previous) =>
          previous
            ? {
                ...previous,
                items: previous.items.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
                unreadCount: 0,
              }
            : previous,
        );
      }
      return true;
    } catch (failure) {
      if (active.current && !controller.signal.aborted) {
        setActionError(errorMessage(failure, true));
        missing = failure instanceof ApiError && failure.status === 404;
      }
      return false;
    } finally {
      mutating.current = false;
      if (active.current) {
        setPendingId(null);
        if (missing) void refresh();
      }
    }
  }

  return {
    items: data?.items ?? [],
    unreadCount: data?.unreadCount ?? 0,
    hasMore: data ? data.page * data.pageSize < data.total : false,
    isLoading,
    isLoadingMore,
    error,
    actionError,
    pendingId,
    markRead,
    refresh,
    loadMore: () => load(page.current + 1, true),
    retry: () => load(failedLoad.current.page, failedLoad.current.append),
  };
}
