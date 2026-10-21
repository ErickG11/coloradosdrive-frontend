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
  const form = screen
    .getByRole("button", { name: /Crear cohorte|Guardar cambios/ })
    .closest("form");
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
      await screen.findByText("El fin de matrícula no puede ser anterior al inicio de matrícula."),
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

  it("anuncia como alerta general el error del servidor sin campo", async () => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValue(
      new ApiError("Ya existe un registro con esos datos.", 409, { code: "DUPLICATE" }),
    );
    render(<CohortForm courses={courses} />);

    fillRequiredFields();
    await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya existe un registro con esos datos.",
    );
  });

  it("muestra en español el aviso de campo obligatorio vacío", async () => {
    const user = userEvent.setup();
    render(<CohortForm courses={courses} />);

    await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

    expect(
      (screen.getByLabelText("Nombre de la cohorte") as HTMLInputElement).validationMessage,
    ).toBe("Completa este campo.");
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
    mockedPost.mockRejectedValue(
      new ApiError("Los datos no cumplen las reglas de validación.", 400, {
        code: "CHECK_VIOLATION",
      }),
    );
    render(<CohortForm courses={courses} />);

    fillRequiredFields();
    await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

    expect(
      await screen.findByText("Los datos no cumplen las reglas de validación."),
    ).toBeInTheDocument();
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
      fireEvent.change(screen.getByLabelText("Número de aulas"), { target: { value: "0" } });
      await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

      await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1));
      expect(mockedPost.mock.calls[0][1]).toMatchObject({
        precio: 0,
        numeroVehiculos: 0,
        numeroAulas: 0,
      });
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

  describe("errores del servidor por campo (contrato L3b)", () => {
    // [field, etiqueta, status, code, mensaje literal del contrato]
    const cases: [string, string, number, string, string][] = [
      ["courseId", "Curso", 400, "INVALID_FIELD", "Selecciona un curso válido."],
      ["courseId", "Curso", 404, "COURSE_NOT_FOUND", "El curso indicado no existe."],
      ["nombre", "Nombre de la cohorte", 400, "INVALID_FIELD", "El nombre es obligatorio."],
      [
        "nombre",
        "Nombre de la cohorte",
        400,
        "INVALID_FIELD",
        "El nombre no puede superar 100 caracteres.",
      ],
      [
        "nombre",
        "Nombre de la cohorte",
        409,
        "COHORT_NAME_DUPLICATE",
        "Ya existe una cohorte con ese nombre en este curso.",
      ],
      ["precio", "Precio", 400, "INVALID_FIELD", "El precio es obligatorio."],
      ["precio", "Precio", 400, "INVALID_FIELD", "El precio debe estar entre 0 y 9999.99."],
      ["precio", "Precio", 400, "INVALID_FIELD", "El precio admite como máximo 2 decimales."],
      [
        "cupoMaximo",
        "Cupo máximo",
        400,
        "INVALID_FIELD",
        "El cupo máximo debe ser un entero entre 1 y 500.",
      ],
      [
        "fechaInicioMatricula",
        "Inicio de matrícula",
        400,
        "INVALID_FIELD",
        "La fecha de inicio de matrícula no es válida.",
      ],
      [
        "fechaFinMatricula",
        "Fin de matrícula",
        400,
        "INVALID_FIELD",
        "La fecha de fin de matrícula no es válida.",
      ],
      [
        "fechaInicioCurso",
        "Inicio de curso",
        400,
        "INVALID_FIELD",
        "La fecha no puede superar 5 años a partir de hoy.",
      ],
      [
        "fechaFinCurso",
        "Fin de curso",
        400,
        "INVALID_FIELD",
        "El curso no puede terminar antes de que abra la matrícula.",
      ],
      [
        "tipoModalidad",
        "Tipo de modalidad",
        400,
        "INVALID_FIELD",
        "La modalidad debe ser un texto de hasta 100 caracteres.",
      ],
      [
        "horariosCapacitacionTeoria",
        "Horarios de capacitación teórica",
        400,
        "INVALID_FIELD",
        "Los horarios de capacitación teórica deben ser un texto de hasta 500 caracteres.",
      ],
      [
        "numeroVehiculos",
        "Número de vehículos",
        400,
        "INVALID_FIELD",
        "El número de vehículos debe ser un entero entre 0 y 100.",
      ],
      [
        "numeroAulas",
        "Número de aulas",
        400,
        "INVALID_FIELD",
        "El número de aulas debe ser un entero entre 0 y 100.",
      ],
    ];

    it.each(cases)(
      "muestra el error de %s junto al campo «%s» (%i %s)",
      async (field, label, status, code, message) => {
        const user = userEvent.setup();
        mockedPost.mockRejectedValue(new ApiError(message, status, { code, field }));
        render(<CohortForm courses={courses} />);

        fillRequiredFields();
        await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent(message);
        // Un solo anuncio: no se repite como error general.
        expect(screen.getAllByRole("alert")).toHaveLength(1);
        expect(screen.getAllByText(message)).toHaveLength(1);
        const input = screen.getByLabelText(label);
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveAttribute("aria-describedby", alert.id);
        expect(input).toHaveFocus();
        expect(pushMock).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Crear cohorte" })).toBeEnabled();
      },
    );

    it("en edición, el nombre duplicado (409) se marca en el nombre y se limpia al cambiarlo", async () => {
      const user = userEvent.setup();
      mockedPatch.mockRejectedValue(
        new ApiError("Ya existe una cohorte con ese nombre en este curso.", 409, {
          code: "COHORT_NAME_DUPLICATE",
          field: "nombre",
        }),
      );
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

      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      const nombre = screen.getByLabelText("Nombre de la cohorte");
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Ya existe una cohorte con ese nombre en este curso.",
      );
      expect(nombre).toHaveAttribute("aria-invalid", "true");

      fireEvent.change(nombre, { target: { value: "Cohorte Julio 2" } });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(nombre).toHaveAttribute("aria-invalid", "false");
    });

    it("al cambiar de curso se descarta el aviso de nombre duplicado", async () => {
      const user = userEvent.setup();
      mockedPost.mockRejectedValue(
        new ApiError("Ya existe una cohorte con ese nombre en este curso.", 409, {
          code: "COHORT_NAME_DUPLICATE",
          field: "nombre",
        }),
      );
      render(<CohortForm courses={courses} />);

      fillRequiredFields();
      await user.click(screen.getByRole("button", { name: "Crear cohorte" }));
      await screen.findByRole("alert");

      fireEvent.change(screen.getByLabelText("Curso"), { target: { value: "course-b" } });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Nombre de la cohorte")).toHaveAttribute(
        "aria-invalid",
        "false",
      );
    });

    it("al reenviar descarta el error de campo anterior", async () => {
      const user = userEvent.setup();
      mockedPost
        .mockRejectedValueOnce(
          new ApiError("El precio admite como máximo 2 decimales.", 400, {
            code: "INVALID_FIELD",
            field: "precio",
          }),
        )
        .mockResolvedValueOnce({});
      render(<CohortForm courses={courses} />);

      fillRequiredFields();
      await user.click(screen.getByRole("button", { name: "Crear cohorte" }));
      await screen.findByRole("alert");

      await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

      await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/admin/cohorts"));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Precio")).toHaveAttribute("aria-invalid", "false");
    });

    it.each([
      [
        "sin campo (404 de cohorte)",
        new ApiError("Cohorte no encontrada.", 404, { code: "COHORT_NOT_FOUND" }),
      ],
      [
        "con field=id",
        new ApiError("La cohorte indicada no es válida.", 400, {
          code: "INVALID_FIELD",
          field: "id",
        }),
      ],
    ])("un error %s se muestra como error general", async (_name, apiError) => {
      const user = userEvent.setup();
      mockedPatch.mockRejectedValue(apiError);
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

      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(apiError.message);
      // Ningún control (texto, número, fecha, selector) queda marcado.
      const form = screen.getByRole("button", { name: "Guardar cambios" }).closest("form");
      const controls = form?.querySelectorAll("input, select") ?? [];
      expect(controls).toHaveLength(12);
      for (const control of controls) {
        expect(control).toHaveAttribute("aria-invalid", "false");
      }
    });

    it("un fallo que no es de la API muestra el aviso genérico", async () => {
      const user = userEvent.setup();
      mockedPost.mockRejectedValue(new TypeError("Failed to fetch"));
      render(<CohortForm courses={courses} />);

      fillRequiredFields();
      await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar la cohorte.");
    });

    it("con una fecha de fin vacía no inventa el error de orden y deja que responda el servidor", async () => {
      mockedPost.mockRejectedValue(
        new ApiError("La fecha de fin de matrícula no es válida.", 400, {
          code: "INVALID_FIELD",
          field: "fechaFinMatricula",
        }),
      );
      render(<CohortForm courses={courses} />);

      fillRequiredFields();
      fireEvent.change(screen.getByLabelText("Fin de matrícula"), { target: { value: "" } });
      submitWithoutNativeValidation();

      await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1));
      expect(mockedPost.mock.calls[0][1]).toMatchObject({ fechaFinMatricula: "" });
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "La fecha de fin de matrícula no es válida.",
      );
      expect(
        screen.queryByText("El fin de matrícula no puede ser anterior al inicio de matrícula."),
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText("Fin de matrícula")).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("regla cruzada: el curso no termina antes de que abra la matrícula", () => {
    it("la valida en el cliente junto a «Fin de curso» sin llamar al servidor", async () => {
      const user = userEvent.setup();
      render(<CohortForm courses={courses} />);

      fillRequiredFields();
      // Ventana de curso coherente (fin >= inicio) pero termina antes de la matrícula.
      fireEvent.change(screen.getByLabelText("Inicio de matrícula"), {
        target: { value: "2026-05-01" },
      });
      fireEvent.change(screen.getByLabelText("Fin de matrícula"), {
        target: { value: "2026-05-20" },
      });
      fireEvent.change(screen.getByLabelText("Inicio de curso"), {
        target: { value: "2026-03-01" },
      });
      fireEvent.change(screen.getByLabelText("Fin de curso"), {
        target: { value: "2026-04-01" },
      });
      await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("El curso no puede terminar antes de que abra la matrícula.");
      expect(screen.getByLabelText("Fin de curso")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText("Fin de curso")).toHaveAttribute("aria-describedby", alert.id);
      expect(mockedPost).not.toHaveBeenCalled();
    });

    it("permite que la matrícula cierre después de que empiece el curso", async () => {
      const user = userEvent.setup();
      mockedPost.mockResolvedValue({});
      render(<CohortForm courses={courses} />);

      fillRequiredFields();
      fireEvent.change(screen.getByLabelText("Fin de matrícula"), {
        target: { value: "2026-03-15" },
      });
      await user.click(screen.getByRole("button", { name: "Crear cohorte" }));

      await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1));
    });

    it("el error del servidor en «Fin de curso» se limpia al corregir «Inicio de matrícula»", async () => {
      const user = userEvent.setup();
      mockedPost.mockRejectedValue(
        new ApiError("El curso no puede terminar antes de que abra la matrícula.", 400, {
          code: "INVALID_FIELD",
          field: "fechaFinCurso",
        }),
      );
      render(<CohortForm courses={courses} />);

      fillRequiredFields();
      await user.click(screen.getByRole("button", { name: "Crear cohorte" }));
      await screen.findByRole("alert");
      expect(screen.getByLabelText("Fin de curso")).toHaveAttribute("aria-invalid", "true");

      fireEvent.change(screen.getByLabelText("Inicio de matrícula"), {
        target: { value: "2026-01-15" },
      });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Fin de curso")).toHaveAttribute("aria-invalid", "false");
    });

    it("al editar «Inicio de matrícula» también se limpia el error de «Fin de matrícula»", async () => {
      const user = userEvent.setup();
      render(<CohortForm courses={courses} />);

      fillRequiredFields();
      fireEvent.change(screen.getByLabelText("Fin de matrícula"), {
        target: { value: "2026-01-01" },
      });
      await user.click(screen.getByRole("button", { name: "Crear cohorte" }));
      await screen.findByRole("alert");

      fireEvent.change(screen.getByLabelText("Inicio de matrícula"), {
        target: { value: "2025-12-01" },
      });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
