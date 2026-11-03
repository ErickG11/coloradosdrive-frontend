import { afterEach, expect, it, vi } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import { PendingSolicitudesBadge } from "@/components/solicitudes-admin/PendingSolicitudesBadge";
import {
  useSolicitudSummary,
  SOLICITUD_CHANGED_EVENT,
} from "@/components/solicitudes-admin/useSolicitudSummary";
import { solicitudes } from "@/lib/api/solicitudes";
vi.mock("@/lib/api/solicitudes", () => ({ solicitudes: { summary: vi.fn() } }));
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
it.each([1, 100])("contador %i tiene texto acotado y aria-label real", (count) => {
  render(<PendingSolicitudesBadge count={count} />);
  expect(screen.getByLabelText(`${count} solicitudes pendientes`)).toHaveTextContent(
    count > 99 ? "99+" : String(count),
  );
});
it("oculta cero", () => {
  const { container } = render(<PendingSolicitudesBadge count={0} />);
  expect(container).toBeEmptyDOMElement();
});
it("consulta inicialmente sin aviso, por temporizador visible, foco y tras decisión", async () => {
  vi.useFakeTimers();
  const visible = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  vi.mocked(solicitudes.summary)
    .mockResolvedValueOnce({ pendientes: 2, documentosPorRevisar: 4 })
    .mockResolvedValueOnce({ pendientes: 3, documentosPorRevisar: 5 })
    .mockResolvedValueOnce({ pendientes: 1, documentosPorRevisar: 1 })
    .mockResolvedValue({ pendientes: 4, documentosPorRevisar: 4 });
  const { result } = renderHook(() => useSolicitudSummary(true));
  await act(async () => {
    await Promise.resolve();
  });
  expect(result.current.pending).toBe(2);
  expect(result.current.notice).toBe(0);
  await act(async () => {
    vi.advanceTimersByTime(30000);
    await Promise.resolve();
  });
  expect(result.current.notice).toBe(1);
  act(() => result.current.dismiss());
  visible.mockReturnValue("hidden");
  await act(async () => {
    vi.advanceTimersByTime(30000);
    await Promise.resolve();
  });
  expect(solicitudes.summary).toHaveBeenCalledTimes(2);
  visible.mockReturnValue("visible");
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
    await Promise.resolve();
  });
  expect(result.current.pending).toBe(1);
  expect(result.current.notice).toBe(0);
  await act(async () => {
    window.dispatchEvent(new Event(SOLICITUD_CHANGED_EVENT));
    await Promise.resolve();
  });
  expect(result.current.pending).toBe(4);
  expect(result.current.notice).toBe(1);
});
it("no consulta para roles distintos del admin", () => {
  renderHook(() => useSolicitudSummary(false));
  expect(solicitudes.summary).not.toHaveBeenCalled();
});
