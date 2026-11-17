import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_VISIBLE_TOASTS,
  TOAST_DURATION_MS,
  ToastProvider,
  useToast,
} from "@/components/ui/Toast";

function Trigger({ text = "Solicitud actualizada", withAction = false }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        toast.success(text, withAction ? { action: { href: "/admin/solicitudes", label: "Ver" } } : undefined)
      }
    >
      Disparar
    </button>
  );
}
const show = (props = {}) =>
  render(
    <ToastProvider>
      <Trigger {...props} />
    </ToastProvider>,
  );

describe("aviso verde global", () => {
  afterEach(() => vi.useRealTimers());

  it("anuncia el éxito en una región viva y no roba el foco", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Disparar" }));
    expect(screen.getByRole("status")).toHaveTextContent("Solicitud actualizada");
    expect(screen.getByRole("button", { name: "Disparar" })).toHaveFocus();
  });

  it("la región viva existe aunque no haya avisos", () => {
    show();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("se puede cerrar con teclado", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Disparar" }));
    await user.tab();
    expect(screen.getByRole("button", { name: "Cerrar aviso" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.queryByTestId("toast")).not.toBeInTheDocument();
  });

  it("Escape cierra el aviso cuando el foco está dentro", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Disparar" }));
    await user.tab();
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("toast")).not.toBeInTheDocument();
  });

  it("incluye el enlace de acción cuando se pide", async () => {
    const user = userEvent.setup();
    show({ withAction: true });
    await user.click(screen.getByRole("button", { name: "Disparar" }));
    expect(screen.getByRole("link", { name: "Ver" })).toHaveAttribute("href", "/admin/solicitudes");
  });

  describe("con reloj simulado", () => {
    beforeEach(() => vi.useFakeTimers());

    it("desaparece solo a los 5 segundos", () => {
      show();
      fireEvent.click(screen.getByRole("button", { name: "Disparar" }));
      expect(screen.getByTestId("toast")).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));
      expect(screen.getByTestId("toast")).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(2));
      expect(screen.queryByTestId("toast")).not.toBeInTheDocument();
    });

    it("se pausa mientras el puntero está encima y sigue al salir", () => {
      show();
      fireEvent.click(screen.getByRole("button", { name: "Disparar" }));
      const card = screen.getByTestId("toast");
      act(() => vi.advanceTimersByTime(3000));
      fireEvent.mouseEnter(card);
      act(() => vi.advanceTimersByTime(10_000));
      expect(screen.getByTestId("toast")).toBeInTheDocument();
      fireEvent.mouseLeave(card);
      act(() => vi.advanceTimersByTime(2100));
      expect(screen.queryByTestId("toast")).not.toBeInTheDocument();
    });

    it("apila hasta el máximo y descarta los más antiguos", () => {
      show();
      for (let i = 0; i < MAX_VISIBLE_TOASTS + 2; i += 1)
        fireEvent.click(screen.getByRole("button", { name: "Disparar" }));
      expect(screen.getAllByTestId("toast")).toHaveLength(MAX_VISIBLE_TOASTS);
    });
  });

  it("sin proveedor el aviso se ignora sin fallar", async () => {
    const user = userEvent.setup();
    render(<Trigger />);
    await user.click(screen.getByRole("button", { name: "Disparar" }));
    expect(screen.queryByTestId("toast")).not.toBeInTheDocument();
  });
});
