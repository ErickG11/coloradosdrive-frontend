import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider, useToast } from "@/components/ui/Toast";

function Trigger({ messages }: { messages: string[] }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => messages.forEach((m) => toast.success(m))}>
      disparar
    </button>
  );
}

function renderToasts(messages: string[] = ["Cohorte creada correctamente."]) {
  return render(
    <ToastProvider>
      <Trigger messages={messages} />
    </ToastProvider>,
  );
}

describe("Toast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("monta la región viva antes de que haya avisos", () => {
    renderToasts();
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toBeEmptyDOMElement();
  });

  it("muestra el mensaje dentro de la región viva", () => {
    renderToasts();
    fireEvent.click(screen.getByText("disparar"));
    expect(screen.getByRole("status")).toHaveTextContent("Cohorte creada correctamente.");
  });

  it("se cierra solo a los 5 segundos", () => {
    renderToasts();
    fireEvent.click(screen.getByText("disparar"));
    act(() => void vi.advanceTimersByTime(4900));
    expect(screen.getByText("Cohorte creada correctamente.")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(200));
    expect(screen.queryByText("Cohorte creada correctamente.")).not.toBeInTheDocument();
  });

  it("pausa el cierre con el mouse encima y lo reanuda al salir", () => {
    renderToasts();
    fireEvent.click(screen.getByText("disparar"));
    const card = screen.getByText("Cohorte creada correctamente.").parentElement!;
    act(() => void vi.advanceTimersByTime(3000));
    fireEvent.mouseEnter(card);
    act(() => void vi.advanceTimersByTime(20000));
    expect(screen.getByText("Cohorte creada correctamente.")).toBeInTheDocument();
    fireEvent.mouseLeave(card);
    act(() => void vi.advanceTimersByTime(1900));
    expect(screen.getByText("Cohorte creada correctamente.")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(200));
    expect(screen.queryByText("Cohorte creada correctamente.")).not.toBeInTheDocument();
  });

  it("pausa el cierre mientras tiene el foco", () => {
    renderToasts();
    fireEvent.click(screen.getByText("disparar"));
    const card = screen.getByText("Cohorte creada correctamente.").parentElement!;
    fireEvent.focus(card);
    act(() => void vi.advanceTimersByTime(20000));
    expect(screen.getByText("Cohorte creada correctamente.")).toBeInTheDocument();
    fireEvent.blur(card);
    act(() => void vi.advanceTimersByTime(5100));
    expect(screen.queryByText("Cohorte creada correctamente.")).not.toBeInTheDocument();
  });

  it("se cierra con el botón de cerrar", () => {
    renderToasts();
    fireEvent.click(screen.getByText("disparar"));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByText("Cohorte creada correctamente.")).not.toBeInTheDocument();
  });

  it("apila como máximo 3 avisos y descarta el más antiguo", () => {
    renderToasts(["Uno.", "Dos.", "Tres.", "Cuatro."]);
    fireEvent.click(screen.getByText("disparar"));
    expect(screen.getAllByRole("button", { name: "Cerrar aviso" })).toHaveLength(3);
    expect(screen.queryByText("Uno.")).not.toBeInTheDocument();
    expect(screen.getByText("Cuatro.")).toBeInTheDocument();
  });

  it("sobrevive a una navegación: el aviso vive en el proveedor del layout", () => {
    function Page({ name }: { name: string }) {
      const toast = useToast();
      return (
        <button type="button" onClick={() => toast.success("Guardado.")}>
          {name}
        </button>
      );
    }
    const { rerender } = render(
      <ToastProvider>
        <Page name="lista" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("lista"));
    rerender(
      <ToastProvider>
        <Page name="detalle" />
      </ToastProvider>,
    );
    expect(screen.getByText("Guardado.")).toBeInTheDocument();
  });

  it("sin proveedor, success no falla", () => {
    render(<Trigger messages={["x"]} />);
    expect(() => fireEvent.click(screen.getByText("disparar"))).not.toThrow();
  });
});
