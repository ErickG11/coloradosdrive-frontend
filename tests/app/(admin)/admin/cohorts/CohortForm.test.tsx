import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CohortForm } from "@/app/(admin)/admin/cohorts/CohortForm";
import { maxCohortDate } from "@/app/(admin)/admin/cohorts/cohortLimits";
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

// Envía el formulario sin la validación nativa (como hace la suite @servidor
// con noValidate): permite comprobar qué llega a la API con campos vacíos.
function submitWithoutNativeValidation() {
  const form = screen.getByRole("button", { name: /Crear cohorte|Guardar cambios/ }).closest("form");
  if (!form) throw new Error("form not found");
  fireEvent.submit(form);
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

  it("asocia el error de fechas al campo y lo anuncia sin marcar los demás", async () => {
    const user = userEvent.setup();
    render(<CohortForm courses={courses} />);

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Fin de curso"), { target: { value: "2026-02-01" } });
    await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("El fin de curso no puede ser anterior al inicio de curso.");
    const field = screen.getByLabelText("Fin de curso");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAttribute("aria-describedby", alert.id);
    expect(screen.getByLabelText("Fin de matrícula")).toHaveAttribute("aria-invalid", "false");
  });

  it("quita el error de fechas en cuanto se corrige el campo", async () => {
    const user = userEvent.setup();
    render(<CohortForm courses={courses} />);

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Fin de curso"), { target: { value: "2026-02-01" } });
    await user.click(screen.getByRole("button", { name: "Crear cohorte" }));
    await screen.findByRole("alert");

    fireEvent.change(screen.getByLabelText("Fin de curso"), { target: { value: "2026-06-01" } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Fin de curso")).toHaveAttribute("aria-invalid", "false");
  });

  it("anuncia como alerta el error devuelto por el servidor", async () => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValue(new ApiError("Ya existe una cohorte", 409));
    render(<CohortForm courses={courses} />);

    fillRequiredFields();
    await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ya existe una cohorte");
  });

  it("muestra en español el aviso de campo obligatorio vacío", async () => {
    const user = userEvent.setup();
    render(<CohortForm courses={courses} />);

    await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

    expect((screen.getByLabelText("Nombre de la cohorte") as HTMLInputElement).validationMessage).toBe(
      "Completa este campo.",
    );
    expect((screen.getByLabelText("Curso") as HTMLSelectElement).validationMessage).toBe(
      "Selecciona una opción.",
    );
    expect((screen.getByLabelText("Cupo máximo") as HTMLInputElement).validationMessage).toBe(
      "Completa este campo.",
    );
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

  describe("campos numéricos vacíos", () => {
    it("envía precio null (no 0) cuando el precio está vacío", async () => {
      mockedPost.mockResolvedValue({});
      render(<CohortForm courses={courses} />);

      fillRequiredFields();
      fireEvent.change(screen.getByLabelText("Precio"), { target: { value: "" } });
      submitWithoutNativeValidation();

      await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1));
      expect(mockedPost.mock.calls[0][1]).toMatchObject({ precio: null });
    });

    it("envía cupo null (no 0) cuando el cupo está vacío", async () => {
      mockedPost.mockResolvedValue({});
      render(<CohortForm courses={courses} />);

      fillRequiredFields();
      fireEvent.change(screen.getByLabelText("Cupo máximo"), { target: { value: "" } });
      submitWithoutNativeValidation();

      await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1));
      expect(mockedPost.mock.calls[0][1]).toMatchObject({ cupoMaximo: null });
    });

    it("conserva el precio 0 escrito explícitamente", async () => {
      const user = userEvent.setup();
      mockedPost.mockResolvedValue({});
      render(<CohortForm courses={courses} />);

      fillRequiredFields();
      fireEvent.change(screen.getByLabelText("Precio"), { target: { value: "0" } });
      fireEvent.change(screen.getByLabelText("Número de vehículos"), { target: { value: "0" } });
      await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

      await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1));
      expect(mockedPost.mock.calls[0][1]).toMatchObject({ precio: 0, numeroVehiculos: 0 });
    });

    it("en edición, vaciar el precio envía null en el PATCH", async () => {
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

      fireEvent.change(screen.getByLabelText("Precio"), { target: { value: "" } });
      submitWithoutNativeValidation();

      await waitFor(() => expect(mockedPatch).toHaveBeenCalledTimes(1));
      expect(mockedPatch.mock.calls[0][1]).toMatchObject({ precio: null });
    });
  });

  describe("límites coherentes con el servidor", () => {
    it("declara los límites de cada campo", () => {
      render(<CohortForm courses={courses} />);

      expect(screen.getByLabelText("Nombre de la cohorte")).toHaveAttribute("maxLength", "100");
      expect(screen.getByLabelText("Tipo de modalidad")).toHaveAttribute("maxLength", "100");
      expect(screen.getByLabelText("Horarios de capacitación teórica")).toHaveAttribute(
        "maxLength",
        "500",
      );

      const precio = screen.getByLabelText("Precio");
      expect(precio).toHaveAttribute("min", "0");
      expect(precio).toHaveAttribute("max", "9999.99");
      expect(precio).toHaveAttribute("step", "0.01");

      const cupo = screen.getByLabelText("Cupo máximo");
      expect(cupo).toHaveAttribute("min", "1");
      expect(cupo).toHaveAttribute("max", "500");
      expect(cupo).toHaveAttribute("step", "1");

      for (const label of ["Número de vehículos", "Número de aulas"]) {
        const field = screen.getByLabelText(label);
        expect(field).toHaveAttribute("min", "0");
        expect(field).toHaveAttribute("max", "100");
        expect(field).toHaveAttribute("step", "1");
      }
    });

    it("limita las fechas a hoy + 5 años", () => {
      render(<CohortForm courses={courses} />);

      const expected = maxCohortDate();
      for (const label of [
        "Inicio de matrícula",
        "Fin de matrícula",
        "Inicio de curso",
        "Fin de curso",
      ]) {
        expect(screen.getByLabelText(label)).toHaveAttribute("type", "date");
        expect(screen.getByLabelText(label)).toHaveAttribute("max", expected);
      }
    });

    it.each([
      ["Cupo máximo", "501", "El valor debe ser como máximo 500."],
      ["Precio", "10000", "El valor debe ser como máximo 9999.99."],
      ["Número de vehículos", "101", "El valor debe ser como máximo 100."],
      ["Número de aulas", "101", "El valor debe ser como máximo 100."],
    ])("bloquea %s fuera de rango (%s) sin llamar a la API", async (label, value, message) => {
      const user = userEvent.setup();
      render(<CohortForm courses={courses} />);

      fillRequiredFields();
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
      await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

      expect((screen.getByLabelText(label) as HTMLInputElement).validationMessage).toBe(message);
      expect(mockedPost).not.toHaveBeenCalled();
    });
  });
});

