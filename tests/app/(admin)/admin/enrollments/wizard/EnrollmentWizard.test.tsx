import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EnrollmentWizard } from "@/app/(admin)/admin/enrollments/wizard/EnrollmentWizard";
import { api } from "@/lib/api/client";
import type { Cohort, Course } from "@/types";

vi.mock("@/lib/api/client", () => ({
  api: {
    post: vi.fn(),
  },
}));

const mockedPost = vi.mocked(api.post);

const courses: Course[] = [
  { id: "course-a", nombre: "Motocicletas", tipo: "A", descripcion: null, createdAt: "", updatedAt: "" },
  {
    id: "course-b",
    nombre: "Vehículos livianos",
    tipo: "B",
    descripcion: null,
    createdAt: "",
    updatedAt: "",
  },
];

const cohorts: Cohort[] = [
  {
    id: "cohort-1",
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
    createdAt: "",
    updatedAt: "",
  },
];

async function completarPasoEstudiante() {
  const user = userEvent.setup();
  fireEvent.change(screen.getByLabelText("Cédula"), { target: { value: "1234567890" } });
  fireEvent.change(screen.getByLabelText("Nombres completos"), {
    target: { value: "Ana Torres" },
  });
  fireEvent.change(screen.getByLabelText("Correo electrónico"), {
    target: { value: "ana@example.com" },
  });
  await user.click(screen.getByRole("button", { name: "Continuar" }));
}

describe("EnrollmentWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completa el flujo feliz: cohorte sugerida, práctica generada, y confirmación", async () => {
    const user = userEvent.setup();
    mockedPost.mockImplementation(async (path: string) => {
      if (path === "/admin/cohort-assignment/preview") {
        return { cohortId: "cohort-1", cohortNombre: "Cohorte Marzo", warning: null };
      }
      if (path === "/enrollments") {
        return {
          student: {
            id: "student-1",
            cedula: "1234567890",
            nombreCompleto: "Ana Torres",
            telefono: null,
            rol: "estudiante",
            createdAt: "",
            updatedAt: "",
          },
          enrollment: {
            id: "enrollment-1",
            studentId: "student-1",
            cohortId: "cohort-1",
            status: "activo",
            montoTotal: 150,
            fechaInscripcion: "",
            createdAt: "",
            updatedAt: "",
          },
        };
      }
      if (path === "/admin/enrollments/enrollment-1/sugerir-practica") {
        return {
          fechas: ["2026-03-02", "2026-03-03"],
          horaDeseada: "08:00",
          horaResuelta: "08:00",
          horaAjustada: false,
          instructoresSugeridos: [{ id: "instructor-1", nombreCompleto: "Carlos Pérez" }],
          totalSesiones: 2,
          horasProgramadas: 4,
          horasRequeridas: 40,
        };
      }
      if (path === "/admin/enrollments/enrollment-1/confirmar-practica") {
        return { slotsCreados: 2, horasProgramadas: 4, horasRequeridas: 40, slotIds: ["s1", "s2"] };
      }
      throw new Error(`ruta inesperada: ${path}`);
    });

    render(<EnrollmentWizard courses={courses} cohorts={cohorts} />);

    await completarPasoEstudiante();

    await user.click(screen.getByRole("button", { name: /Tipo A/ }));
    await screen.findByText("Cohorte Marzo");
    expect(mockedPost).toHaveBeenCalledWith("/admin/cohort-assignment/preview", {
      courseId: "course-a",
    });

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith(
        "/enrollments",
        expect.objectContaining({ cedula: "1234567890", cohortId: "cohort-1" }),
      );
    });

    await screen.findByRole("button", { name: "Ver sugerencia" });
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), {
      target: { value: "2026-03-02" },
    });

    await user.click(screen.getByRole("button", { name: "Ver sugerencia" }));

    await screen.findByText("Carlos Pérez");
    expect(screen.getByLabelText("Instructor")).toHaveValue("instructor-1");

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await screen.findByRole("button", { name: "Confirmar matrícula y práctica" });
    await user.click(screen.getByRole("button", { name: "Confirmar matrícula y práctica" }));

    expect(
      await screen.findByText(/Ana Torres fue matriculado correctamente/),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 sesiones programadas/)).toBeInTheDocument();
  });

  it("sin cohorte disponible: permite continuar y finalizar sin programar práctica", async () => {
    const user = userEvent.setup();
    mockedPost.mockImplementation(async (path: string) => {
      if (path === "/admin/cohort-assignment/preview") {
        return { cohortId: null, mensaje: "ninguna cohorte con matrícula abierta" };
      }
      if (path === "/enrollments") {
        return {
          student: {
            id: "student-1",
            cedula: "1234567890",
            nombreCompleto: "Ana Torres",
            telefono: null,
            rol: "estudiante",
            createdAt: "",
            updatedAt: "",
          },
          enrollment: {
            id: "enrollment-2",
            studentId: "student-1",
            cohortId: null,
            status: "pendiente_cohorte",
            montoTotal: null,
            fechaInscripcion: "",
            createdAt: "",
            updatedAt: "",
          },
        };
      }
      throw new Error(`ruta inesperada: ${path}`);
    });

    render(<EnrollmentWizard courses={courses} cohorts={cohorts} />);

    await completarPasoEstudiante();

    await user.click(screen.getByRole("button", { name: /Tipo A/ }));
    await screen.findByText(/Sin cohorte disponible/);

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith(
        "/enrollments",
        expect.objectContaining({ courseId: "course-a" }),
      );
    });

    await screen.findByText(/no se puede generar un horario de práctica todavía/);
    await user.click(screen.getByRole("button", { name: "Finalizar matrícula sin práctica" }));

    await user.click(await screen.findByRole("button", { name: "Finalizar matrícula" }));

    expect(
      await screen.findByText(/Ana Torres fue matriculado correctamente/),
    ).toBeInTheDocument();
    expect(screen.getByText("Práctica: sin programar todavía")).toBeInTheDocument();
  });
});
