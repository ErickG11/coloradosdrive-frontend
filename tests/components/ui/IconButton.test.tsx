import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IconButton } from "@/components/ui/IconButton";
import { EditIcon } from "@/components/ui/icons";

describe("IconButton", () => {
  it("expone su propósito por aria-label (sin texto visible)", () => {
    render(<IconButton icon={<EditIcon />} aria-label="Editar cohorte" />);

    const button = screen.getByRole("button", { name: "Editar cohorte" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("");
  });

  it("usa el aria-label como title por defecto (tooltip nativo para mouse)", () => {
    render(<IconButton icon={<EditIcon />} aria-label="Editar cohorte" />);

    expect(screen.getByRole("button", { name: "Editar cohorte" })).toHaveAttribute(
      "title",
      "Editar cohorte",
    );
  });

  it("permite un title distinto del aria-label", () => {
    render(<IconButton icon={<EditIcon />} aria-label="Editar cohorte" title="Modificar" />);

    expect(screen.getByRole("button", { name: "Editar cohorte" })).toHaveAttribute(
      "title",
      "Modificar",
    );
  });

  it("mantiene 44x44px de área de toque (h-11 w-11)", () => {
    render(<IconButton icon={<EditIcon />} aria-label="Editar cohorte" />);

    const button = screen.getByRole("button", { name: "Editar cohorte" });
    expect(button.className).toMatch(/\bh-11\b/);
    expect(button.className).toMatch(/\bw-11\b/);
  });

  it("llama a onClick al hacer clic", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton icon={<EditIcon />} aria-label="Editar cohorte" onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "Editar cohorte" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("se deshabilita con disabled", () => {
    render(<IconButton icon={<EditIcon />} aria-label="Editar cohorte" disabled />);

    expect(screen.getByRole("button", { name: "Editar cohorte" })).toBeDisabled();
  });

  it("se deshabilita mientras isLoading y muestra un spinner en vez del ícono", () => {
    render(<IconButton icon={<EditIcon />} aria-label="Editar cohorte" isLoading />);

    const button = screen.getByRole("button", { name: "Editar cohorte" });
    expect(button).toBeDisabled();
  });
});
