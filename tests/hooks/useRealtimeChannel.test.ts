import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { createClient } from "@/lib/supabase/client";

const mockedCreateClient = vi.mocked(createClient);

type SubscribeCallback = (status: string, err?: Error) => void;

interface MockChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  emit: (event: string, payload: unknown) => void;
  triggerSubscribeStatus: (status: string, err?: Error) => void;
}

function createMockChannel(): MockChannel {
  const listeners = new Map<string, (arg: { payload: unknown }) => void>();
  let subscribeCallback: SubscribeCallback | undefined;
  const channel = {
    on: vi.fn(
      (_type: string, filter: { event: string }, cb: (arg: { payload: unknown }) => void) => {
        listeners.set(filter.event, cb);
        return channel;
      },
    ),
    subscribe: vi.fn((cb?: SubscribeCallback) => {
      subscribeCallback = cb;
      return channel;
    }),
    emit: (event: string, payload: unknown) => listeners.get(event)?.({ payload }),
    triggerSubscribeStatus: (status: string, err?: Error) => subscribeCallback?.(status, err),
  };
  return channel as unknown as MockChannel;
}

// Por defecto simula una sesión ya activa con el token aplicado de
// inmediato - así los tests que no les importa el flujo de auth (la
// mayoría, ya escritos antes de esa validación) no tienen que preocuparse
// por él.
function mockClientWith(
  channel: MockChannel | (() => MockChannel),
  session: { access_token: string } | null = { access_token: "test-access-token" },
) {
  const removeChannel = vi.fn();
  const channelFactory =
    typeof channel === "function" ? vi.fn(channel) : vi.fn().mockReturnValue(channel);
  const getSession = vi.fn().mockResolvedValue({ data: { session } });
  const setAuth = vi.fn().mockResolvedValue(undefined);
  mockedCreateClient.mockReturnValue({
    channel: channelFactory,
    removeChannel,
    auth: { getSession },
    realtime: { setAuth },
  } as unknown as ReturnType<typeof createClient>);
  return { channelFactory, removeChannel, getSession, setAuth };
}

describe("useRealtimeChannel", () => {
  beforeEach(() => {
    mockedCreateClient.mockReset();
  });

  it("no crea ningún cliente ni canal si channelName es null", () => {
    renderHook(() => useRealtimeChannel(null, { "slot-released": vi.fn() }));

    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("invoca el handler correspondiente al evento recibido", () => {
    const channel = createMockChannel();
    mockClientWith(channel);
    const onSlotReleased = vi.fn();

    renderHook(() =>
      useRealtimeChannel("cohort-1-practice-slots", { "slot-released": onSlotReleased }),
    );

    channel.emit("slot-released", { slotId: "abc", scheduledAt: "2026-01-01T10:00:00Z" });

    expect(onSlotReleased).toHaveBeenCalledWith({
      slotId: "abc",
      scheduledAt: "2026-01-01T10:00:00Z",
    });
  });

  it("invoca siempre la versión más reciente del handler sin reabrir el canal en cada render", () => {
    const channel = createMockChannel();
    const { channelFactory } = mockClientWith(channel);

    const firstHandler = vi.fn();
    const { rerender } = renderHook(
      ({ handler }) => useRealtimeChannel("cohort-1-practice-slots", { "slot-released": handler }),
      { initialProps: { handler: firstHandler } },
    );

    const secondHandler = vi.fn();
    rerender({ handler: secondHandler });

    channel.emit("slot-released", { slotId: "abc" });

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledWith({ slotId: "abc" });
    // Mismo canal durante ambos renders: no se creó uno nuevo por el
    // cambio de identidad de la función handler.
    expect(channelFactory).toHaveBeenCalledTimes(1);
  });

  it("se desuscribe (removeChannel) al desmontar", () => {
    const channel = createMockChannel();
    const { removeChannel } = mockClientWith(channel);

    const { unmount } = renderHook(() =>
      useRealtimeChannel("cohort-1-practice-slots", { "slot-released": vi.fn() }),
    );

    unmount();

    expect(removeChannel).toHaveBeenCalledWith(channel);
  });

  it("se desuscribe del canal anterior y abre uno nuevo cuando cambia channelName", () => {
    const channelA = createMockChannel();
    const channelB = createMockChannel();
    let call = 0;
    const { removeChannel } = mockClientWith(() => (call++ === 0 ? channelA : channelB));

    const { rerender } = renderHook(
      ({ name }: { name: string }) => useRealtimeChannel(name, { "slot-released": vi.fn() }),
      { initialProps: { name: "cohort-1-practice-slots" } },
    );

    rerender({ name: "cohort-2-practice-slots" });

    expect(removeChannel).toHaveBeenCalledWith(channelA);
  });

  describe("sesión de Supabase Auth antes de suscribirse", () => {
    it("espera la sesión y aplica el JWT a realtime (setAuth) ANTES de llamar a subscribe()", async () => {
      const channel = createMockChannel();
      const { getSession, setAuth } = mockClientWith(channel);

      renderHook(() => useRealtimeChannel("cohort-1-practice-slots", { "slot-released": vi.fn() }));

      await waitFor(() => {
        expect(channel.subscribe).toHaveBeenCalled();
      });

      expect(getSession).toHaveBeenCalled();
      expect(setAuth).toHaveBeenCalledWith("test-access-token");
      // Orden: setAuth debe resolverse antes de que se llame a subscribe,
      // no solo "en algún momento" - si no, el join puede salir sin el JWT
      // aplicado todavía.
      const setAuthOrder = setAuth.mock.invocationCallOrder[0];
      const subscribeOrder = channel.subscribe.mock.invocationCallOrder[0];
      expect(setAuthOrder).toBeLessThan(subscribeOrder);
    });

    it("si no hay sesión activa, nunca llama a subscribe() y loguea un error claro", async () => {
      const channel = createMockChannel();
      mockClientWith(channel, null);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      renderHook(() => useRealtimeChannel("cohort-1-practice-slots", { "slot-released": vi.fn() }));

      await waitFor(() => {
        expect(errorSpy).toHaveBeenCalled();
      });

      expect(channel.subscribe).not.toHaveBeenCalled();
      expect(errorSpy.mock.calls[0][0]).toContain("cohort-1-practice-slots");

      errorSpy.mockRestore();
    });

    it("no se suscribe si el efecto ya se limpió (unmount) mientras la sesión seguía resolviéndose", async () => {
      const channel = createMockChannel();
      let resolveSession!: (value: { data: { session: { access_token: string } | null } }) => void;
      const getSession = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveSession = resolve;
          }),
      );
      const removeChannel = vi.fn();
      mockedCreateClient.mockReturnValue({
        channel: vi.fn().mockReturnValue(channel),
        removeChannel,
        auth: { getSession },
        realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
      } as unknown as ReturnType<typeof createClient>);

      const { unmount } = renderHook(() =>
        useRealtimeChannel("cohort-1-practice-slots", { "slot-released": vi.fn() }),
      );
      unmount();
      resolveSession({ data: { session: { access_token: "demasiado-tarde" } } });
      await Promise.resolve();
      await Promise.resolve();

      expect(channel.subscribe).not.toHaveBeenCalled();
    });
  });

  describe("manejo de CHANNEL_ERROR (no falla en silencio)", () => {
    it("loguea un error claro si el status de subscribe() es CHANNEL_ERROR", async () => {
      const channel = createMockChannel();
      mockClientWith(channel);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      renderHook(() => useRealtimeChannel("cohort-1-practice-slots", { "slot-released": vi.fn() }));

      await waitFor(() => {
        expect(channel.subscribe).toHaveBeenCalled();
      });
      channel.triggerSubscribeStatus(
        "CHANNEL_ERROR",
        new Error("politica RLS rechazo la suscripcion"),
      );

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("cohort-1-practice-slots"),
        expect.any(Error),
      );
      expect(errorSpy.mock.calls[0][0]).toContain("CHANNEL_ERROR");

      errorSpy.mockRestore();
    });

    it("no loguea nada cuando el status es SUBSCRIBED", async () => {
      const channel = createMockChannel();
      mockClientWith(channel);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      renderHook(() => useRealtimeChannel("cohort-1-practice-slots", { "slot-released": vi.fn() }));

      await waitFor(() => {
        expect(channel.subscribe).toHaveBeenCalled();
      });
      channel.triggerSubscribeStatus("SUBSCRIBED");

      expect(errorSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });
});
