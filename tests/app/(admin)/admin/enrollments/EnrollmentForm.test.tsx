import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EnrollmentForm } from "@/app/(admin)/admin/enrollments/EnrollmentForm";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Cohort } from "@/types";

vi.mock("@/lib/api/client", () => ({
  api: {
    post: vi.fn(),
  },
}));

const mockedPost = vi.mocked(api.post);

const cohorts: Cohort[] = [
  {
    id: "cohort-1",
    courseId: "course-a",
    nombre: "Cohorte Marzo",
    precio: 150,
    cupoMaximo: 20,
    fechaInicio: "2026-03-01",
    fechaFin: "2026-06-01",
    createdAt: "",
    updatedAt: "",
  },
];

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Cédula"), { target: { value: "1234567890" } });
  fireEvent.change(screen.getByLabelText("Nombres completos"), {
    target: { value: "Ana Torres" },
  });
  fireEvent.change(screen.getByLabelText("Correo electrónico"), {
    target: { value: "ana@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Cohorte"), { target: { value: "cohort-1" } });
}

describe("EnrollmentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marca los campos requeridos (excepto teléfono)", () => {
    render(<EnrollmentForm cohorts={cohorts} />);

    expect(screen.getByLabelText("Cédula")).toBeRequired();
    expect(screen.getByLabelText("Nombres completos")).toBeRequired();
    expect(screen.getByLabelText("Correo electrónico")).toBeRequired();
    expect(screen.getByLabelText("Cohorte")).toBeRequired();
    expect(screen.getByLabelText("Teléfono")).not.toBeRequired();
  });

  it("envía POST /enrollments y muestra un mensaje de éxito claro", async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue({
      student: { id: "student-1", nombreCompleto: "Ana Torres" },
      enrollment: { id: "enrollment-1" },
    });
    render(<EnrollmentForm cohorts={cohorts} />);

    fillRequiredFields();
    await user.click(screen.getByRole("button", { name: "Matricular estudiante" }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith("/enrollments", {
        cedula: "1234567890",
        nombreCompleto: "Ana Torres",
        correo: "ana@example.com",
        telefono: undefined,
        cohortId: "cohort-1",
      });
    });

    expect(await screen.findByText(/Ana Torres fue matriculado correctamente/)).toBeInTheDocument();
    expect(screen.getByText(/ana@example\.com/)).toBeInTheDocument();
    // El formulario se limpia para matricular al siguiente estudiante.
    expect(screen.getByLabelText("Cédula")).toHaveValue("");
  });

  it("muestra un mensaje legible (no JSON crudo) si la cédula ya está registrada", async () => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValue(new ApiError("La cédula ya está registrada", 409));
    render(<EnrollmentForm cohorts={cohorts} />);

    fillRequiredFields();
    await user.click(screen.getByRole("button", { name: "Matricular estudiante" }));

    expect(await screen.findByText("La cédula ya está registrada")).toBeInTheDocument();
  });
});
