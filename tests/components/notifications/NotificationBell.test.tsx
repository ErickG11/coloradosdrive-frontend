import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Notification, NotificationsPage } from "@/types/notification";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }));
const get = vi.mocked(api.get);
const patch = vi.mocked(api.patch);
const post = vi.mocked(api.post);

function notice(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notice-1",
    tipo: "recordatorio_practica",
    titulo: "Tu práctica comienza pronto",
    mensaje: "Confirmar es opcional.",
    practiceSlotId: "slot-1",
    scheduledAt: "2026-10-27T20:00:00Z",
    createdAt: "2026-10-27T19:40:00Z",
    readAt: null,
    emailStatus: "pendiente",
    emailAttempts: 1,
    ...overrides,
  };
}
const first = notice();
const second = notice({
  id: "notice-2",
  titulo: "Cambiaste tu horario",
  tipo: "cambio_realizado",
  emailStatus: null,
});
function page(
  items = [first, second],
  overrides: Partial<NotificationsPage> = {},
): NotificationsPage {
  return {
    items,
    page: 1,
    pageSize: 20,
    total: items.length,
    unreadCount: items.filter((item) => !item.readAt).length,
    ...overrides,
  };
}
async function open(role: "estudiante" | "instructor" = "estudiante") {
  const user = userEvent.setup();
  const rendered = render(<NotificationBell role={role} />);
  const bell = await screen.findByRole("button", { name: "Notificaciones, 2 sin leer" });
  await user.click(bell);
  return { user, bell, ...rendered };
}

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockReset();
    get.mockResolvedValue(page());
    patch.mockResolvedValue({ ...first, readAt: "2026-10-27T19:45:00Z" });
    post.mockResolvedValue({ updatedCount: 2 });
  });
  afterEach(() => vi.useRealTimers());

  it("consulta al montar y muestra el contador en el nombre accesible", async () => {
    render(<NotificationBell role="estudiante" />);
    expect(
      await screen.findByRole("button", { name: "Notificaciones, 2 sin leer" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(get).toHaveBeenCalledWith(
      "/notifications?page=1&pageSize=20",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre con foco gestionado y cierra con Escape o el boton, devolviendo el foco", async () => {
    const { user, bell } = await open();
    expect(screen.getByRole("dialog", { name: "Notificaciones" })).toHaveFocus();
    expect(bell).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(bell).toHaveFocus();
    await user.click(bell);
    await user.click(screen.getByRole("button", { name: "Cerrar notificaciones" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(bell).toHaveFocus();
  });

  it("permite recorrer los avisos con flechas, Inicio y Fin", async () => {
    const { user } = await open();
    const a = screen.getByRole("button", { name: /Tu práctica comienza pronto/ });
    const b = screen.getByRole("button", { name: /Cambiaste tu horario/ });
    a.focus();
    await user.keyboard("{ArrowDown}");
    expect(b).toHaveFocus();
    await user.keyboard("{Home}");
    expect(a).toHaveFocus();
    await user.keyboard("{End}");
    expect(b).toHaveFocus();
  });

  it.each([
    ["estudiante", "/student/schedule"],
    ["instructor", "/instructor"],
  ] as const)("marca una como leida antes de navegar como %s", async (role, destination) => {
    const { user } = await open(role);
    await user.click(screen.getByRole("button", { name: /Tu práctica comienza pronto/ }));
    expect(patch).toHaveBeenCalledWith(
      "/notifications/notice-1/read",
      undefined,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(push).toHaveBeenCalledWith(destination);
    expect(screen.getByRole("button", { name: "Notificaciones, 1 sin leer" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("un aviso sin franja se puede leer sin navegar ni cerrar la bandeja", async () => {
    get.mockResolvedValue(page([notice({ practiceSlotId: null }), second]));
    patch.mockResolvedValue({ ...first, practiceSlotId: null, readAt: "2026-10-27T19:45:00Z" });
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: /Tu práctica comienza pronto/ }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: /Tu práctica comienza pronto/ })).getByText(
        "Leído",
      ),
    ).toBeInTheDocument();
  });

  it("marca todas como leidas y vacia el contador incluso si otra sesion ya lo hizo", async () => {
    post.mockResolvedValue({ updatedCount: 0 });
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "Marcar todas como leídas" }));
    expect(post).toHaveBeenCalledWith(
      "/notifications/read-all",
      undefined,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByRole("button", { name: "Notificaciones, 0 sin leer" })).toBeInTheDocument();
    expect(screen.getAllByText("Leído")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Marcar todas como leídas" })).toBeDisabled();
  });

  it("muestra el estado vacio", async () => {
    get.mockResolvedValue(page([]));
    const user = userEvent.setup();
    render(<NotificationBell role="estudiante" />);
    await user.click(screen.getByRole("button", { name: "Notificaciones, 0 sin leer" }));
    expect(await screen.findByText("No tienes avisos por ahora")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar todas como leídas" })).toBeDisabled();
  });

  it("muestra la carga inicial", async () => {
    get.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<NotificationBell role="estudiante" />);
    await user.click(screen.getByRole("button", { name: "Notificaciones, 0 sin leer" }));
    expect(screen.getByRole("status")).toHaveTextContent("Cargando avisos");
  });

  it("muestra un error y permite reintentar la consulta", async () => {
    get.mockRejectedValueOnce(new ApiError("Error interno", 500)).mockResolvedValueOnce(page());
    const user = userEvent.setup();
    render(<NotificationBell role="estudiante" />);
    await user.click(screen.getByRole("button", { name: "Notificaciones, 0 sin leer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar tus avisos");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByRole("button", { name: /Tu práctica comienza pronto/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("carga la pagina siguiente conservando la anterior y sin duplicar avisos", async () => {
    get
      .mockResolvedValueOnce(page([first], { total: 21, unreadCount: 2 }))
      .mockResolvedValueOnce(page([first, second], { page: 2, total: 21, unreadCount: 2 }));
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "Cargar más" }));
    expect(await screen.findByRole("button", { name: /Cambiaste tu horario/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Tu práctica comienza pronto/ })).toHaveLength(1);
    expect(get).toHaveBeenLastCalledWith("/notifications?page=2&pageSize=20", expect.any(Object));
    expect(screen.queryByRole("button", { name: "Cargar más" })).not.toBeInTheDocument();
  });

  it("presenta el horario de Ecuador y el fallo de correo como informacion discreta", async () => {
    get.mockResolvedValue(page([notice({ emailStatus: "fallido" }), second]));
    await open();
    const item = screen.getByRole("button", { name: /Tu práctica comienza pronto/ });
    expect(item).toHaveTextContent(/03:00|15:00/);
    expect(item).not.toHaveTextContent("08:00");
    expect(within(item).getByText("No se pudo enviar el correo")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("no navega ni cambia el contador si falla marcar un aviso", async () => {
    patch.mockRejectedValue(new ApiError("Forbidden", 403));
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: /Tu práctica comienza pronto/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tu cuenta no tiene acceso");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Notificaciones, 2 sin leer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tu práctica comienza pronto/ })).toBeEnabled();
  });

  it("actualiza la lista si un aviso ya no existe", async () => {
    patch.mockRejectedValue(new ApiError("No existe", 404));
    const { user } = await open();
    get.mockResolvedValue(page([]));
    await user.click(screen.getByRole("button", { name: /Tu práctica comienza pronto/ }));
    expect(await screen.findByText("No tienes avisos por ahora")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("ya no está disponible");
  });

  it("consulta cada 60 segundos y al recuperar foco, y limpia ambos al desmontar", async () => {
    vi.useFakeTimers();
    const { unmount } = render(<NotificationBell role="estudiante" />);
    await act(async () => {});
    expect(get).toHaveBeenCalledTimes(1);
    get.mockResolvedValue(page([first]));
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(get).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Notificaciones, 1 sin leer" })).toBeInTheDocument();
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(get).toHaveBeenCalledTimes(3);
    unmount();
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      window.dispatchEvent(new Event("focus"));
    });
    expect(get).toHaveBeenCalledTimes(3);
  });

  it("una consulta anterior no deshace una lectura completada", async () => {
    const { user } = await open();
    let complete!: (value: NotificationsPage) => void;
    get.mockReturnValueOnce(
      new Promise<NotificationsPage>((resolve) => {
        complete = resolve;
      }),
    );
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await user.click(screen.getByRole("button", { name: /Tu práctica comienza pronto/ }));
    await act(async () => {
      complete(page());
    });
    expect(screen.getByRole("button", { name: "Notificaciones, 1 sin leer" })).toBeInTheDocument();
  });

  it.each(["admin", null] as const)("no monta campana ni consulta para %s", (role) => {
    render(<NotificationBell role={role} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it("abortar al desmontar evita navegar por una lectura que termino despues", async () => {
    let complete!: (value: Notification) => void;
    patch.mockReturnValueOnce(
      new Promise<Notification>((resolve) => {
        complete = resolve;
      }),
    );
    const { user, unmount } = await open();
    await user.click(screen.getByRole("button", { name: /Tu práctica comienza pronto/ }));
    unmount();
    await act(async () => {
      complete({ ...first, readAt: first.createdAt });
    });
    await waitFor(() => expect(push).not.toHaveBeenCalled());
  });
});
