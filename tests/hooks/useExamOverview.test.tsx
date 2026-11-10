import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { useExamOverview } from "@/components/exams-admin/useExamOverview";
import type { Exam } from "@/types/exam";
vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn() } }));
const examsA = Array.from(
  { length: 6 },
  (_, index) => ({ id: `a${index}`, updatedAt: "1" }) as Exam,
);
const examsB = [{ id: "b", updatedAt: "1" } as Exam];
beforeEach(() => vi.resetAllMocks());

it("limita solicitudes concurrentes a cuatro, carga solo el curso elegido y reutiliza caché al volver", async () => {
  let active = 0,
    peak = 0;
  vi.mocked(api.get).mockImplementation(async (path) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return String(path).startsWith("/exams/") ? { questions: [] } : [];
  });
  const { result, rerender } = renderHook(({ course, exams }) => useExamOverview(course, exams), {
    initialProps: { course: "A", exams: examsA },
  });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(peak).toBeLessThanOrEqual(4);
  expect(api.get).toHaveBeenCalledTimes(13); // subjects + 2 per exam; no placement rules
  expect(vi.mocked(api.get).mock.calls.some(([path]) => String(path).includes("/courses/B/"))).toBe(
    false,
  );
  rerender({ course: "B", exams: examsB });
  await waitFor(() => expect(result.current.data?.entries.b).toBeDefined());
  const count = vi.mocked(api.get).mock.calls.length;
  rerender({ course: "A", exams: examsA });
  await waitFor(() => expect(result.current.data?.entries.a0).toBeDefined());
  expect(api.get).toHaveBeenCalledTimes(count);
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(api.get).toHaveBeenCalledTimes(count + 13);
});

it("aborta al cambiar de curso e ignora la respuesta anterior tardía", async () => {
  let release!: (value: unknown) => void;
  let oldSignal: AbortSignal | undefined;
  vi.mocked(api.get).mockImplementation((path, options) => {
    if (String(path).includes("/courses/A/")) {
      oldSignal = options?.signal as AbortSignal;
      return new Promise((resolve) => {
        release = resolve;
      });
    }
    return Promise.resolve(String(path).startsWith("/exams/") ? { questions: [] } : []);
  });
  const { result, rerender } = renderHook(({ course, exams }) => useExamOverview(course, exams), {
    initialProps: { course: "A", exams: examsA },
  });
  rerender({ course: "B", exams: examsB });
  await waitFor(() => expect(result.current.data?.entries.b).toBeDefined());
  expect(oldSignal?.aborted).toBe(true);
  await act(async () => release([]));
  expect(result.current.data?.entries.b).toBeDefined();
  expect(result.current.data?.entries.a0).toBeUndefined();
});
