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
  fireEvent.change(screen.getByLabelText("Inicio de matrícula"), {
    target: { value: "2026-02-01" },
  });
  fireEvent.change(screen.getByLabelText("Fin de matrícula"), {
    target: { value: "2026-02-25" },
  });
  fireEvent.change(screen.getByLabelText("Inicio de curso"), {
    target: { value: "2026-03-01" },
  });
  fireEvent.change(screen.getByLabelText("Fin de curso"), { target: { value: "2026-06-01" } });
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
    expect(screen.getByLabelText("Inicio de matrícula")).toBeRequired();
    expect(screen.getByLabelText("Fin de matrícula")).toBeRequired();
    expect(screen.getByLabelText("Inicio de curso")).toBeRequired();
    expect(screen.getByLabelText("Fin de curso")).toBeRequired();
    expect(screen.getByLabelText("Tipo de modalidad")).not.toBeRequired();
    expect(screen.getByLabelText("Número de vehículos")).not.toBeRequired();
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
        fechaInicioMatricula: "2026-02-01",
        fechaFinMatricula: "2026-02-25",
        fechaInicioCurso: "2026-03-01",
        fechaFinCurso: "2026-06-01",
        tipoModalidad: null,
        horariosCapacitacionTeoria: null,
        numeroVehiculos: null,
        numeroAulas: null,
      });
    });
    expect(pushMock).toHaveBeenCalledWith("/admin/cohorts");
  });

  it("envía los campos de metadata opcional cuando se completan", async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue({});
    render(<CohortForm courses={courses} />);

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Tipo de modalidad"), {
      target: { value: "Presencial" },
    });
    fireEvent.change(screen.getByLabelText("Horarios de capacitación teórica"), {
      target: { value: "Lunes a viernes, 18:00-20:00" },
    });
    fireEvent.change(screen.getByLabelText("Número de vehículos"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Número de aulas"), { target: { value: "1" } });

    await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith(
        "/cohorts",
        expect.objectContaining({
          tipoModalidad: "Presencial",
          horariosCapacitacionTeoria: "Lunes a viernes, 18:00-20:00",
          numeroVehiculos: 3,
          numeroAulas: 1,
        }),
      );
    });
  });

  it("muestra un error si el fin de matrícula es anterior al inicio", async () => {
    const user = userEvent.setup();
    render(<CohortForm courses={courses} />);

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Fin de matrícula"), {
      target: { value: "2026-01-01" },
    });

    await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

    expect(
      await screen.findByText(
        "El fin de matrícula no puede ser anterior al inicio de matrícula.",
      ),
    ).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
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
          fechaInicioMatricula: "2026-06-01",
          fechaFinMatricula: "2026-06-25",
          fechaInicioCurso: "2026-07-01",
          fechaFinCurso: "2026-09-01",
          tipoModalidad: "",
          horariosCapacitacionTeoria: "",
          numeroVehiculos: "",
          numeroAulas: "",
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
        fechaInicioMatricula: "2026-06-01",
        fechaFinMatricula: "2026-06-25",
        fechaInicioCurso: "2026-07-01",
        fechaFinCurso: "2026-09-01",
        tipoModalidad: null,
        horariosCapacitacionTeoria: null,
        numeroVehiculos: null,
        numeroAulas: null,
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
