import { expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
vi.mock("@/hooks/useFetch", () => ({ useFetch: vi.fn() }));
import { useFetch } from "@/hooks/useFetch";
import { StudentPendingDocuments } from "@/components/inscripcion/StudentPendingDocuments";
it("oculta el bloque cuando no hay pendientes", () => {
  vi.mocked(useFetch).mockReturnValue({
    data: { documentosPendientes: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  const { container } = render(<StudentPendingDocuments />);
  expect(container).toBeEmptyDOMElement();
});
it("muestra plazo y mensaje de cohorte pendiente", () => {
  vi.mocked(useFetch).mockReturnValue({
    data: {
      documentosPendientes: ["cedula"],
      fechaLimite: "2026-11-10",
      diasRestantes: 5,
      cohortePendiente: true,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  render(<StudentPendingDocuments />);
  expect(screen.getByRole("status")).toHaveTextContent("Te quedan 5 días");
  expect(screen.getByText(/Tu matrícula está pendiente de cohorte/)).toBeInTheDocument();
});

it("actualiza el plazo mientras hay documentos pendientes y limpia el temporizador", () => {
  vi.useFakeTimers();
  const refetch = vi.fn();
  vi.mocked(useFetch).mockReturnValue({
    data: {
      documentosPendientes: ["cedula"],
      fechaLimite: null,
      diasRestantes: null,
      cohortePendiente: true,
    },
    isLoading: false,
    error: null,
    refetch,
  });
  const view = render(<StudentPendingDocuments />);
  act(() => vi.advanceTimersByTime(60000));
  expect(refetch).toHaveBeenCalledOnce();
  view.unmount();
  act(() => vi.advanceTimersByTime(60000));
  expect(refetch).toHaveBeenCalledOnce();
  vi.useRealTimers();
});
