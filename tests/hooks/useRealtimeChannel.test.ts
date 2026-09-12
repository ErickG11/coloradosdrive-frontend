import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { createClient } from "@/lib/supabase/client";

const mockedCreateClient = vi.mocked(createClient);

interface MockChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  emit: (event: string, payload: unknown) => void;
}

function createMockChannel(): MockChannel {
  const listeners = new Map<string, (arg: { payload: unknown }) => void>();
  const channel = {
    on: vi.fn((_type: string, filter: { event: string }, cb: (arg: { payload: unknown }) => void) => {
      listeners.set(filter.event, cb);
      return channel;
    }),
    subscribe: vi.fn().mockReturnThis(),
    emit: (event: string, payload: unknown) => listeners.get(event)?.({ payload }),
  };
  return channel as unknown as MockChannel;
}

function mockClientWith(channel: MockChannel | (() => MockChannel)) {
  const removeChannel = vi.fn();
  const channelFactory = typeof channel === "function" ? vi.fn(channel) : vi.fn().mockReturnValue(channel);
  mockedCreateClient.mockReturnValue({
    channel: channelFactory,
    removeChannel,
  } as unknown as ReturnType<typeof createClient>);
  return { channelFactory, removeChannel };
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
});
