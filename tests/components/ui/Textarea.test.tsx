import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Textarea } from "@/components/ui/Textarea";

describe("Textarea", () => {
  it("renders a label associated with the textarea", () => {
    render(<Textarea label="Enunciado" name="prompt" />);

    const textarea = screen.getByLabelText("Enunciado");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute("name", "prompt");
  });

  it("lets the user type a value", async () => {
    const user = userEvent.setup();
    render(<Textarea label="Enunciado" name="prompt" />);

    const textarea = screen.getByLabelText("Enunciado");
    await user.type(textarea, "¿Qué significa una señal triangular roja?");

    expect(textarea).toHaveValue("¿Qué significa una señal triangular roja?");
  });

  it("shows an accessible error message and marks the textarea as invalid", () => {
    render(<Textarea label="Enunciado" name="prompt" error="El enunciado es obligatorio" />);

    const textarea = screen.getByLabelText("Enunciado");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("El enunciado es obligatorio")).toBeInTheDocument();
  });
});
