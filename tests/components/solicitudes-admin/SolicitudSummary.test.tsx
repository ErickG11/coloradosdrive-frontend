import { afterEach, expect, it, vi } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import { PendingSolicitudesBadge } from "@/components/solicitudes-admin/PendingSolicitudesBadge";
import {
  useSolicitudSummary,
  SOLICITUD_CHANGED_EVENT,
} from "@/components/solicitudes-admin/useSolicitudSummary";
import type { ResumenSolicitudes } from "@/types/inscripcion";
import { getResumenSolicitudes } from "@/lib/api/inscripcion";
vi.mock("@/lib/api/inscripcion", async (original) => ({
  ...(await original<typeof import("@/lib/api/inscripcion")>()),
  getResumenSolicitudes: vi.fn(),
}));
const resumen = (pendientes: number): ResumenSolicitudes => ({
  pendientes,
  devueltas: 0,
  conMasDe48h: 0,
  cupoCodigosHoy: { usado: 0, tope: 250 },
  cupoSubidasHoy: { usado: 0, tope: 40 },
  inscripcionesAbiertas: true,
});
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
  vi.mocked(getResumenSolicitudes)
    .mockResolvedValueOnce(resumen(2))
    .mockResolvedValueOnce(resumen(3))
    .mockResolvedValueOnce(resumen(1))
    .mockResolvedValue(resumen(4));
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
  expect(getResumenSolicitudes).toHaveBeenCalledTimes(2);
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
  expect(getResumenSolicitudes).not.toHaveBeenCalled();
});
