import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn() } }));
describe("useFetch: resultados anteriores", () => {
  it("ignora una respuesta y un error lentos de consultas anteriores", async () => {
    let oldResolve!: (value: unknown) => void;
    let oldReject!: (reason: unknown) => void;
    vi.mocked(api.get)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          oldResolve = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          oldReject = reject;
        }),
      )
      .mockResolvedValueOnce({ nombre: "última" });
    const { result, rerender } = renderHook(({ path }) => useFetch<{ nombre: string }>(path), {
      initialProps: { path: "/primera" },
    });
    rerender({ path: "/segunda" });
    rerender({ path: "/última" });
    await waitFor(() => expect(result.current.data).toEqual({ nombre: "última" }));
    await act(async () => {
      oldResolve({ nombre: "vieja" });
      oldReject(new ApiError("viejo", 500));
    });
    expect(result.current.data).toEqual({ nombre: "última" });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
  it("conserva el status HTTP para 401/403/404 y permite reintentar", async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new ApiError("No encontrado", 404))
      .mockResolvedValueOnce({ id: "ficticio" });
    const { result } = renderHook(() => useFetch("/ficha"));
    await waitFor(() => expect(result.current.errorStatus).toBe(404));
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.data).toEqual({ id: "ficticio" }));
    expect(result.current.error).toBeNull();
    expect(result.current.errorStatus).toBeNull();
  });
});
