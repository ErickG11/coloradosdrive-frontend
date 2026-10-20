import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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

  describe("mensajes de validación en español", () => {
    it("replaces the browser message for a missing required value", () => {
      render(<Input label="Nombre" name="nombre" required />);

      const input = screen.getByLabelText("Nombre") as HTMLInputElement;
      expect(input.checkValidity()).toBe(false);

      expect(input.validationMessage).toBe("Completa este campo.");
    });

    it("explains an invalid email", async () => {
      const user = userEvent.setup();
      render(<Input label="Correo" name="email" type="email" />);

      const input = screen.getByLabelText("Correo") as HTMLInputElement;
      await user.type(input, "no-es-correo");
      input.checkValidity();

      expect(input.validationMessage).toBe("Escribe un correo válido.");
    });

    it("explains a value below the minimum", async () => {
      const user = userEvent.setup();
      render(<Input label="Cupo" name="cupo" type="number" min="1" />);

      const input = screen.getByLabelText("Cupo") as HTMLInputElement;
      await user.type(input, "0");
      input.checkValidity();

      expect(input.validationMessage).toBe("El valor debe ser como mínimo 1.");
    });

    it("clears the message as soon as the user types, so it does not stay stuck", async () => {
      const user = userEvent.setup();
      render(<Input label="Nombre" name="nombre" required />);

      const input = screen.getByLabelText("Nombre") as HTMLInputElement;
      input.checkValidity();
      expect(input.validationMessage).toBe("Completa este campo.");

      await user.type(input, "Cohorte 1");

      expect(input.validationMessage).toBe("");
      expect(input.checkValidity()).toBe(true);
    });

    it("clears the message when the controlled value changes without typing", () => {
      const { rerender } = render(
        <Input label="Nombre" name="nombre" required value="" onChange={() => {}} />,
      );

      const input = screen.getByLabelText("Nombre") as HTMLInputElement;
      input.checkValidity();
      expect(input.validationMessage).toBe("Completa este campo.");

      rerender(
        <Input label="Nombre" name="nombre" required value="Cohorte 1" onChange={() => {}} />,
      );

      expect(input.validationMessage).toBe("");
      expect(input.checkValidity()).toBe(true);
    });

    it("keeps a custom message set by the form itself", async () => {
      const user = userEvent.setup();
      render(<Input label="Nombre" name="nombre" required />);

      const input = screen.getByLabelText("Nombre") as HTMLInputElement;
      input.setCustomValidity("Mensaje del formulario");
      input.checkValidity();
      expect(input.validationMessage).toBe("Mensaje del formulario");

      await user.type(input, "a");

      expect(input.validationMessage).toBe("Mensaje del formulario");
    });

    it("still calls the onInvalid and onInput handlers of the caller", async () => {
      const user = userEvent.setup();
      const onInvalid = vi.fn();
      const onInput = vi.fn();
      render(
        <Input label="Nombre" name="nombre" required onInvalid={onInvalid} onInput={onInput} />,
      );

      const input = screen.getByLabelText("Nombre") as HTMLInputElement;
      input.checkValidity();
      await user.type(input, "a");

      expect(onInvalid).toHaveBeenCalledTimes(1);
      expect(onInput).toHaveBeenCalledTimes(1);
    });

    it("blocks the submit of a form with an invalid field", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <Input label="Nombre" name="nombre" required />
          <button type="submit">Enviar</button>
        </form>,
      );

      await user.click(screen.getByRole("button", { name: "Enviar" }));

      expect(onSubmit).not.toHaveBeenCalled();
      expect((screen.getByLabelText("Nombre") as HTMLInputElement).validationMessage).toBe(
        "Completa este campo.",
      );
    });
  });

  describe("errores accesibles", () => {
    it("links the error to the input and announces it with role=alert", () => {
      render(<Input label="Correo" name="email" error="Correo inválido" />);

      const input = screen.getByLabelText("Correo");
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Correo inválido");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAttribute("aria-describedby", alert.id);
    });

    it("is not invalid and has no alert without error", () => {
      render(<Input label="Correo" name="email" />);

      const input = screen.getByLabelText("Correo");
      expect(input).toHaveAttribute("aria-invalid", "false");
      expect(input).not.toHaveAttribute("aria-describedby");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
