import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Input } from "@/components/ui/Input";

describe("Input", () => {
  it("renders a label associated with the input", () => {
    render(<Input label="Correo electrónico" name="email" />);

    const input = screen.getByLabelText("Correo electrónico");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("name", "email");
  });

  it("lets the user type a value", async () => {
    const user = userEvent.setup();
    render(<Input label="Correo electrónico" name="email" />);

    const input = screen.getByLabelText("Correo electrónico");
    await user.type(input, "erick@example.com");

    expect(input).toHaveValue("erick@example.com");
  });

  it("shows an accessible error message and marks the input as invalid", () => {
    render(<Input label="Correo electrónico" name="email" error="Correo inválido" />);

    const input = screen.getByLabelText("Correo electrónico");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Correo inválido")).toBeInTheDocument();
  });
});
