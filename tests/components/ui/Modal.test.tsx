import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "@/components/ui/Modal";

describe("Modal", () => {
  it("contiene el foco con Tab y lo devuelve al disparador al cerrar con Escape", async () => {
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Abrir detalle</button>
          <Modal isOpen={open} title="Detalle" onClose={() => setOpen(false)}>
            <input aria-label="Observación" />
            <button>Guardar observación</button>
          </Modal>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Abrir detalle" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Guardar observación" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
  it("no renderiza nada cuando isOpen es false", () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Detalle">
        Contenido
      </Modal>,
    );

    expect(screen.queryByText("Contenido")).not.toBeInTheDocument();
  });

  it("renderiza el título y el contenido cuando isOpen es true", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Detalle de la franja">
        Contenido
      </Modal>,
    );

    expect(screen.getByRole("dialog", { name: "Detalle de la franja" })).toBeInTheDocument();
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("llama a onClose al hacer clic en el botón de cerrar", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Detalle">
        Contenido
      </Modal>,
    );

    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("llama a onClose con la tecla Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Detalle">
        Contenido
      </Modal>,
    );

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
