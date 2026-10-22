import { useState } from "react";
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

  it("con hover y foco a la vez, soltar uno no reanuda mientras el otro siga activo", () => {
    renderToasts();
    fireEvent.click(screen.getByText("disparar"));
    const card = screen.getByText("Cohorte creada correctamente.").parentElement!;
    fireEvent.mouseEnter(card);
    fireEvent.focus(card);
    fireEvent.mouseLeave(card);
    act(() => void vi.advanceTimersByTime(20000));
    expect(screen.getByText("Cohorte creada correctamente.")).toBeInTheDocument();
    fireEvent.blur(card);
    act(() => void vi.advanceTimersByTime(5100));
    expect(screen.queryByText("Cohorte creada correctamente.")).not.toBeInTheDocument();
  });

  it("mover el foco entre hijos de la tarjeta no reanuda el cierre", () => {
    renderToasts();
    fireEvent.click(screen.getByText("disparar"));
    const card = screen.getByText("Cohorte creada correctamente.").parentElement!;
    const close = screen.getByRole("button", { name: "Cerrar aviso" });
    fireEvent.focus(card);
    fireEvent.blur(card, { relatedTarget: close });
    act(() => void vi.advanceTimersByTime(20000));
    expect(screen.getByText("Cohorte creada correctamente.")).toBeInTheDocument();
  });

  it("al desmontar no quedan temporizadores pendientes", () => {
    const { unmount } = renderToasts();
    fireEvent.click(screen.getByText("disparar"));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
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

  it("sobrevive a una navegación: la página que lo dispara se desmonta y el aviso sigue", () => {
    function Saved({ go }: { go: () => void }) {
      const toast = useToast();
      return (
        <button
          type="button"
          onClick={() => {
            toast.success("Guardado.");
            go();
          }}
        >
          guardar
        </button>
      );
    }
    // Hace de layout: el proveedor queda fijo y solo cambia la "página".
    function Layout() {
      const [page, setPage] = useState<"lista" | "detalle">("lista");
      return (
        <ToastProvider>
          {page === "lista" ? <Saved go={() => setPage("detalle")} /> : <p>detalle</p>}
        </ToastProvider>
      );
    }
    render(<Layout />);
    fireEvent.click(screen.getByText("guardar"));
    expect(screen.queryByText("guardar")).not.toBeInTheDocument();
    expect(screen.getByText("detalle")).toBeInTheDocument();
    expect(screen.getByText("Guardado.")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(5100));
    expect(screen.queryByText("Guardado.")).not.toBeInTheDocument();
  });

  it("sin proveedor, success no falla", () => {
    render(<Trigger messages={["x"]} />);
    expect(() => fireEvent.click(screen.getByText("disparar"))).not.toThrow();
  });
});
