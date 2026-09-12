import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "@/components/ui/Modal";

describe("Modal", () => {
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
