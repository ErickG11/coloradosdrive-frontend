import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePendingPracticeRatings } from "@/hooks/usePendingPracticeRatings";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { PendingPracticeRatingsPage } from "@/types/practiceRating";

vi.mock("@/hooks/useFetch", () => ({ useFetch: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn() } }));
const useFetchMock = vi.mocked(useFetch);
const get = vi.mocked(api.get);
const refetch = vi.fn();
const first: PendingPracticeRatingsPage = {
  items: [
    {
      practiceSlotId: "slot-1",
      instructorName: "Ana",
      scheduledAt: "date",
      opensAt: "open",
      closesAt: "close",
    },
  ],
  total: 101,
  page: 1,
  pageSize: 100,
};

describe("usePendingPracticeRatings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFetchMock.mockReturnValue({
      data: first,
      isLoading: false,
      error: null,
      errorStatus: null,
      errorCode: null,
      refetch,
    });
  });

  it("carga todas las páginas antes de confirmar acciones", async () => {
    get.mockResolvedValue({
      items: [{ ...first.items[0], practiceSlotId: "slot-2" }],
      total: 101,
      page: 2,
      pageSize: 100,
    });
    const { result } = renderHook(() => usePendingPracticeRatings());
    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    await waitFor(() =>
      expect(result.current.items.map((item) => item.practiceSlotId)).toEqual(["slot-1", "slot-2"]),
    );
    expect(get).toHaveBeenCalledWith(
      "/estudiantes/practice-ratings/pending?page=2&pageSize=100",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("no ofrece acciones si falla una página", async () => {
    get.mockRejectedValue(new Error("sin conexión"));
    const { result } = renderHook(() => usePendingPracticeRatings());
    await waitFor(() =>
      expect(result.current.error).toBe("No se pudieron cargar todas tus encuestas."),
    );
    expect(result.current.items).toEqual([]);
  });
});
