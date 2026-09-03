import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CohortForm } from "@/app/(admin)/admin/cohorts/CohortForm";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Course } from "@/types";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockedPost = vi.mocked(api.post);
const mockedPatch = vi.mocked(api.patch);

const courses: Course[] = [
  {
    id: "course-a",
    nombre: "Motocicletas",
    tipo: "A",
    descripcion: null,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "course-b",
    nombre: "Vehículos livianos",
    tipo: "B",
    descripcion: null,
    createdAt: "",
    updatedAt: "",
  },
];

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Curso"), { target: { value: "course-a" } });
  fireEvent.change(screen.getByLabelText("Nombre de la cohorte"), {
    target: { value: "Cohorte Marzo" },
  });
  fireEvent.change(screen.getByLabelText("Precio"), { target: { value: "150" } });
  fireEvent.change(screen.getByLabelText("Cupo máximo"), { target: { value: "20" } });
  fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-03-01" } });
  fireEvent.change(screen.getByLabelText("Fecha de fin"), { target: { value: "2026-06-01" } });
}

describe("CohortForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marca los campos requeridos", () => {
    render(<CohortForm courses={courses} />);

    expect(screen.getByLabelText("Curso")).toBeRequired();
    expect(screen.getByLabelText("Nombre de la cohorte")).toBeRequired();
    expect(screen.getByLabelText("Precio")).toBeRequired();
    expect(screen.getByLabelText("Cupo máximo")).toBeRequired();
    expect(screen.getByLabelText("Fecha de inicio")).toBeRequired();
    expect(screen.getByLabelText("Fecha de fin")).toBeRequired();
  });

  it("en modo creación envía POST /cohorts y redirige al listado", async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue({});
    render(<CohortForm courses={courses} />);

    fillRequiredFields();
    await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith("/cohorts", {
        courseId: "course-a",
        nombre: "Cohorte Marzo",
        precio: 150,
        cupoMaximo: 20,
        fechaInicio: "2026-03-01",
        fechaFin: "2026-06-01",
      });
    });
    expect(pushMock).toHaveBeenCalledWith("/admin/cohorts");
  });

  it("en modo edición prellena los valores y envía PATCH /cohorts/:id", async () => {
    const user = userEvent.setup();
    mockedPatch.mockResolvedValue({});
    render(
      <CohortForm
        courses={courses}
        cohortId="cohort-1"
        initialValues={{
          courseId: "course-b",
          nombre: "Cohorte Julio",
          precio: "200",
          cupoMaximo: "15",
          fechaInicio: "2026-07-01",
          fechaFin: "2026-09-01",
        }}
      />,
    );

    expect(screen.getByLabelText("Nombre de la cohorte")).toHaveValue("Cohorte Julio");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockedPatch).toHaveBeenCalledWith("/cohorts/cohort-1", {
        courseId: "course-b",
        nombre: "Cohorte Julio",
        precio: 200,
        cupoMaximo: 15,
        fechaInicio: "2026-07-01",
        fechaFin: "2026-09-01",
      });
    });
  });

  it("muestra el mensaje de error del backend si falla el guardado", async () => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValue(new ApiError("El precio debe ser mayor o igual a 0", 400));
    render(<CohortForm courses={courses} />);

    fillRequiredFields();
    await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

    expect(await screen.findByText("El precio debe ser mayor o igual a 0")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
