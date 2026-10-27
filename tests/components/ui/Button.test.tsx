import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button, buttonClassName as legacyStyles } from "@/components/ui/Button";
import { buttonClassName } from "@/components/ui/buttonStyles";
import { buttonClassName as publicStyles } from "@/components/ui";

describe("Button", () => {
  it("conserva el helper publico y los estilos compartidos sin frontera cliente", () => {
    expect(legacyStyles).toBe(buttonClassName);
    expect(publicStyles).toBe(buttonClassName);
    const classes = buttonClassName("secondary", "sm", "extra");
    const { container } = render(
      <Button variant="secondary" size="sm" className="extra">
        Guardar
      </Button>,
    );
    expect(container.querySelector("button")?.className).toBe(classes);
  });
  it("renders its children", () => {
    render(<Button>Guardar</Button>);

    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows a loading label and disables the button when isLoading is true", () => {
    render(<Button isLoading>Guardar</Button>);

    const button = screen.getByRole("button", { name: "Cargando…" });
    expect(button).toBeDisabled();
  });

  it("is disabled when disabled is passed explicitly", () => {
    render(<Button disabled>Guardar</Button>);

    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("renders an optional icon before the text", () => {
    render(<Button icon={<svg data-testid="icon" />}>Reclamar</Button>);

    const button = screen.getByRole("button", { name: "Reclamar" });
    expect(button.querySelector('[data-testid="icon"]')).toBeInTheDocument();
  });

  it("hides the icon while isLoading (el texto ya cambia a Cargando...)", () => {
    render(
      <Button icon={<svg data-testid="icon" />} isLoading>
        Reclamar
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Cargando…" });
    expect(button.querySelector('[data-testid="icon"]')).not.toBeInTheDocument();
  });
});
