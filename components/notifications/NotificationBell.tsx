"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { XIcon } from "@/components/ui/icons";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useNotifications } from "@/hooks/useNotifications";
import { formatPracticeDateTime } from "@/lib/utils/schoolTime";
import type { Notification } from "@/types/notification";
import type { Role } from "@/types/user";

export function NotificationBell({ role }: { role: Role | null }) {
  if (role !== "estudiante" && role !== "instructor") return null;
  return <UserNotificationBell role={role} />;
}

function UserNotificationBell({ role }: { role: "estudiante" | "instructor" }) {
  const notifications = useNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();
  const close = () => setOpen(false);
  useDialogFocus(open, panel, close);
  const busy = notifications.pendingId !== null;

  async function read(notification: Notification) {
    const saved = await notifications.markRead(notification);
    if (saved && notification.practiceSlotId) {
      close();
      router.push(role === "estudiante" ? "/student/schedule" : "/instructor");
    }
  }

  function navigateList(event: KeyboardEvent<HTMLUListElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        "button[data-notification]:not([disabled])",
      ),
    );
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0 || buttons.length === 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
  }

  return (
    <div className="relative">
      <div className="relative">
        <IconButton
          aria-label={`Notificaciones, ${notifications.unreadCount} sin leer`}
          title="Abrir notificaciones"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          icon={<BellIcon />}
          onClick={() => setOpen((value) => !value)}
        />
        {notifications.unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-1 -top-0.5 min-w-5 rounded-full bg-brand-primary px-1 text-center text-[11px] font-semibold leading-5 text-white"
          >
            {notifications.unreadCount > 99 ? "99+" : notifications.unreadCount}
          </span>
        ) : null}
      </div>
      {open ? (
        <>
          <div
            aria-hidden="true"
            onPointerDown={close}
            className="fixed inset-0 z-40 bg-black/20"
          />
          <div
            id={panelId}
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="fixed inset-x-0 top-16 z-50 flex max-h-[calc(100dvh-5rem)] flex-col border border-border bg-bg-surface shadow-elevated outline-none md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:max-h-[min(40rem,calc(100dvh-6rem))] md:w-[26rem] md:rounded-lg"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0 pt-1">
                <h2 id={titleId} className="text-base font-semibold text-text-primary">
                  Notificaciones
                </h2>
                <p className="mt-1 text-xs text-text-secondary">
                  Tus avisos guardados · hora de Ecuador
                </p>
              </div>
              <IconButton
                icon={<XIcon className="h-5 w-5" />}
                aria-label="Cerrar notificaciones"
                onClick={close}
              />
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain p-3">
              {notifications.isLoading ? (
                <p role="status" className="px-3 py-6 text-center text-sm text-text-secondary">
                  Cargando avisos…
                </p>
              ) : null}
              {notifications.error ? (
                <EmptyState
                  error
                  title="No pudimos cargar tus avisos"
                  description={notifications.error}
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        void notifications.retry();
                      }}
                    >
                      Reintentar
                    </Button>
                  }
                />
              ) : null}
              {notifications.actionError ? (
                <p
                  role="alert"
                  className="mb-3 rounded-sm border border-border px-3 py-2 text-sm text-text-secondary"
                >
                  {notifications.actionError}
                </p>
              ) : null}
              {!notifications.isLoading &&
              !notifications.error &&
              notifications.items.length === 0 ? (
                <EmptyState
                  title="No tienes avisos por ahora"
                  description="Aquí aparecerán los avisos de tus prácticas, aunque no tengas la pantalla abierta."
                />
              ) : null}
              {notifications.items.length > 0 ? (
                <ul
                  aria-label="Avisos guardados"
                  onKeyDown={navigateList}
                  className="flex flex-col gap-2"
                >
                  {notifications.items.map((notification) => (
                    <li key={notification.id}>
                      <button
                        type="button"
                        data-notification={notification.id}
                        disabled={busy}
                        aria-busy={notifications.pendingId === notification.id || undefined}
                        onClick={() => {
                          void read(notification);
                        }}
                        className="flex w-full min-w-0 flex-col items-start gap-2 rounded-md border border-border px-3 py-3 text-left transition-colors hover:bg-bg-sunken disabled:cursor-wait"
                      >
                        <span className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2">
                          <span className="min-w-0 break-words text-sm font-semibold text-text-primary">
                            {notification.titulo}
                          </span>
                          {!notification.readAt ? (
                            <StatusBadge status="pendiente" tone="info" label="Sin leer" />
                          ) : (
                            <span className="text-xs text-text-secondary">Leído</span>
                          )}
                        </span>
                        <span className="break-words text-sm leading-6 text-text-secondary">
                          {notification.mensaje}
                        </span>
                        {notification.scheduledAt ? (
                          <span className="text-xs leading-5 text-text-secondary">
                            Práctica:{" "}
                            <time dateTime={notification.scheduledAt}>
                              {formatPracticeDateTime(notification.scheduledAt)}
                            </time>
                          </span>
                        ) : null}
                        <time
                          dateTime={notification.createdAt}
                          className="text-xs text-text-secondary"
                        >
                          {formatPracticeDateTime(notification.createdAt)}
                        </time>
                        {notification.emailStatus === "fallido" ? (
                          <span className="text-xs text-text-secondary">
                            No se pudo enviar el correo
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {notifications.hasMore ? (
                <Button
                  variant="secondary"
                  className="mt-3 w-full"
                  disabled={busy || notifications.isLoading}
                  isLoading={notifications.isLoadingMore}
                  onClick={() => {
                    void notifications.loadMore();
                  }}
                >
                  Cargar más
                </Button>
              ) : null}
            </div>
            <div className="shrink-0 border-t border-border px-3 py-2">
              <Button
                variant="ghost"
                className="w-full"
                disabled={busy || notifications.isLoading || notifications.unreadCount === 0}
                isLoading={notifications.pendingId === "all"}
                onClick={() => {
                  void notifications.markRead();
                }}
              >
                Marcar todas como leídas
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </svg>
  );
}
