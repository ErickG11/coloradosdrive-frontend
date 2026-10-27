import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentsPage from "@/app/(admin)/admin/students/page";
import { StudentDetail } from "@/app/(admin)/admin/students/StudentDetail";
import { useFetch } from "@/hooks/useFetch";
import type { Cohort, Course, StudentDetail as Detail, StudentList } from "@/types";

vi.mock("@/hooks/useFetch", () => ({ useFetch: vi.fn() }));
const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ replace: navigation.replace }),
}));

const id = "11111111-1111-4111-8111-111111111111";
const courseId = "22222222-2222-4222-8222-222222222222";
const refetch = vi.fn();
const course = { id: courseId, nombre: "Curso de prueba", tipo: "A" } as Course;
const list: StudentList = {
  total: 1,
  page: 1,
  pageSize: 20,
  items: [
    {
      id,
      cedula: "0000000001",
      nombreCompleto: "Alumno ficticio",
      telefono: null,
      activo: true,
      createdAt: "2026-01-01T00:00:00Z",
      matchingEnrollments: [],
    },
  ],
};
const detail: Detail = {
  ...list.items[0],
  status: "verificado",
  mustChangePassword: false,
  correo: "ficticio@example.test",
  correoDisponible: true,
  fechaNacimiento: "2000-02-29",
  tipoSangre: null,
  genero: null,
  ciudadania: null,
  direccion: null,
  updatedAt: "2026-01-01T00:00:00.123456Z",
  graduation: { pendingCount: null, enrollments: [] },
  practiceSchedule: { upcoming: [], recovery: [], recent: [] },
  enrollments: [
    {
      enrollmentId: "matricula",
      studentId: id,
      courseId,
      courseType: "A",
      cohortId: null,
      status: "pendiente_cohorte",
      fechaInscripcion: "2026-01-01",
      curso: course,
      cohorte: null,
      montoTotal: 100,
      montoAbonado: 25,
      saldo: 75,
      descuento: 0,
      precioBruto: 100,
      documentosPendientes: 0,
      documentos: [{ tipo: "cedula", estado: "entregado", fechaMarcado: null, marcadoPor: null }],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  navigation.params = new URLSearchParams();
  // jsdom no implementa matchMedia; el panel lo consulta para el modo móvil.
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  vi.mocked(useFetch).mockImplementation(((path: string) => ({
    refetch,
    isLoading: false,
    error: null,
    data:
      path === "/courses"
        ? [course]
        : path === "/cohorts"
          ? ([] as Cohort[])
          : path === `/admin/estudiantes/${id}`
            ? detail
            : path.startsWith("/admin/estudiantes?")
              ? list
              : null,
  })) as typeof useFetch);
});

describe("ficha en el panel lateral", () => {
  it("separa la ficha en pestañas sin perder secciones ni acciones", () => {
    render(<StudentDetail id={id} embedded />);
    expect(screen.queryByRole("link", { name: "Volver a Alumnos" })).not.toBeInTheDocument();
    const tabs = within(screen.getByRole("navigation", { name: "Secciones de la ficha" }));
    expect(tabs.getByRole("button", { name: "Información" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Contacto y matrícula actual")).toBeInTheDocument();
    expect(screen.getByText("Requisitos para graduarse")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Asignar cohorte" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.queryByText("Total")).not.toBeInTheDocument();

    fireEvent.click(tabs.getByRole("button", { name: "Matrículas" }));
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.queryByText("Contacto y matrícula actual")).not.toBeInTheDocument();

    fireEvent.click(tabs.getByRole("button", { name: "Documentos" }));
    expect(screen.getByText("Entregado")).toBeInTheDocument();

    fireEvent.click(tabs.getByRole("button", { name: "Prácticas" }));
    expect(screen.getByText("Horario de prácticas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });

  it("abre la ficha desde el listado sin perder filtros y la cierra", () => {
    navigation.params = new URLSearchParams("activo=true");
    const pushState = vi.spyOn(window.history, "pushState");
    render(<StudentsPage />);
    expect(screen.queryByRole("region", { name: "Ficha del alumno" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Ver ficha de Alumno ficticio" }));
    expect(pushState).toHaveBeenLastCalledWith(
      null,
      "",
      `/admin/students/${id}?page=1&activo=true`,
    );
    const drawer = within(screen.getByRole("region", { name: "Ficha del alumno" }));
    expect(drawer.getByRole("heading", { name: "Alumno ficticio" })).toBeInTheDocument();

    fireEvent.click(drawer.getByRole("button", { name: "Cerrar ficha del alumno" }));
    expect(pushState).toHaveBeenLastCalledWith(null, "", "/admin/students?page=1&activo=true");
    pushState.mockRestore();
  });
});
