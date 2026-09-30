import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InstructorForm } from "@/app/(admin)/admin/instructors/InstructorForm";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn(), patch: vi.fn() } }));

const mockedPost = vi.mocked(api.post);
const onSaved = vi.fn();
const onCancel = vi.fn();

function fill() {
  fireEvent.change(screen.getByLabelText("Cédula"), { target: { value: "1710034065" } });
  fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Bruno Salas" } });
  fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "0991234567" } });
  fireEvent.change(screen.getByLabelText("Correo electrónico"), {
    target: { value: "bruno@example.com" },
  });
}

describe("InstructorForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("valida diez dígitos antes de enviar", () => {
    render(<InstructorForm onSaved={onSaved} onCancel={onCancel} />);
    fill();
    fireEvent.change(screen.getByLabelText("Cédula"), { target: { value: "123" } });
    fireEvent.submit(screen.getByRole("button", { name: "Guardar" }).closest("form")!);
    expect(screen.getByText("La cédula debe tener 10 dígitos numéricos.")).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("muestra junto a cédula el rechazo del dígito verificador del backend", async () => {
    mockedPost.mockRejectedValue(new ApiError("cedula debe ser una cédula ecuatoriana válida", 400));
    render(<InstructorForm onSaved={onSaved} onCancel={onCancel} />);
    fill();
    await userEvent.setup().click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(screen.getByLabelText("Cédula")).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByText("cedula debe ser una cédula ecuatoriana válida")).toBeInTheDocument();
    expect(mockedPost).toHaveBeenCalledWith("/admin/instructores", {
      cedula: "1710034065", nombreCompleto: "Bruno Salas", telefono: "0991234567",
      correo: "bruno@example.com",
    });
  });
});
