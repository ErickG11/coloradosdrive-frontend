import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentsPage from "@/app/(admin)/admin/students/page";
import { StudentDetail } from "@/app/(admin)/admin/students/StudentDetail";
import { StudentsList } from "@/app/(admin)/admin/students/StudentsWorkspace";
import { cohortOptions } from "@/tests/fixtures/studentCohort";
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
            : path.endsWith("/cohortes")
              ? cohortOptions
              : path.endsWith("/gestion")
                ? { documentsEnabled: true }
                : path.startsWith("/admin/estudiantes?")
                  ? list
                  : null,
  })) as typeof useFetch);
});

describe("C10 vistas de alumno", () => {
  it("Ficha contiene solo Información y Prácticas, con acciones en el encabezado", () => {
    render(<StudentDetail id={id} embedded />);
    const tabs = within(screen.getByRole("tablist", { name: "Ficha del alumno" }));
    expect(tabs.getAllByRole("tab")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Contacto" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cuenta y acceso" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Asignar cohorte" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Más acciones del alumno")).toBeInTheDocument();
    fireEvent.click(tabs.getByRole("tab", { name: "Prácticas" }));
    expect(screen.getByText("Horario de prácticas")).toBeInTheDocument();
  });
  it.each([
    ["ficha", "Ficha"],
    ["matriculas", "Matrículas"],
    ["documentos", "Documentos"],
  ])("abre %s desde su acción y conserva los filtros", (view, label) => {
    navigation.params = new URLSearchParams("activo=true");
    const pushState = vi.spyOn(window.history, "pushState");
    render(<StudentsPage />);
    expect(screen.getByRole("columnheader", { name: "Acciones" })).toBeInTheDocument();
    const opener = screen.getByRole("link", { name: `${label} de Alumno ficticio` });
    expect(opener).toHaveAttribute(
      "href",
      `/admin/students/${id}?page=1&activo=true&vista=${view}`,
    );
    fireEvent.click(opener);
    expect(pushState).toHaveBeenLastCalledWith(
      null,
      "",
      `/admin/students/${id}?page=1&activo=true&vista=${view}`,
    );
    const drawer = screen.getByRole("dialog", { name: "Alumno ficticio" });
    fireEvent.click(within(drawer).getByRole("button", { name: "Cerrar panel" }));
    expect(pushState).toHaveBeenLastCalledWith(null, "", "/admin/students?page=1&activo=true");
    pushState.mockRestore();
  });
  it.each([
    ["matriculas", "Asignar cohorte"],
    ["documentos", "Estado de Documento de identidad original"],
  ])("recargar el enlace %s conserva la vista", (view, label) => {
    navigation.params = new URLSearchParams(`vista=${view}`);
    render(<StudentsList initialSelected={id} />);
    expect(screen.getByRole("dialog", { name: "Alumno ficticio" })).toBeInTheDocument();
    expect(
      screen.getByRole(view === "matriculas" ? "button" : "group", { name: label }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Contacto" })).not.toBeInTheDocument();
  });
  it("Matrículas abre la elección dentro del mismo panel y permite volver", () => {
    render(<StudentDetail id={id} embedded view="matriculas" />);
    fireEvent.click(screen.getByRole("button", { name: "Asignar cohorte" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByLabelText("Motivo de la asignación")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Volver a Matrículas" }));
    expect(screen.getByRole("button", { name: "Asignar cohorte" })).toBeInTheDocument();
  });
  it("Matrículas permite cambiar una cohorte dentro del mismo panel", () => {
    const original = vi.mocked(useFetch).getMockImplementation()!;
    vi.mocked(useFetch).mockImplementation(((path: string) =>
      path === `/admin/estudiantes/${id}`
        ? {
            data: {
              ...detail,
              enrollments: [
                {
                  ...detail.enrollments[0],
                  status: "activo",
                  cohorte: {
                    id: "current",
                    nombre: "Actual",
                    fecha_inicio_curso: "2026-11-20",
                    fecha_fin_curso: "2026-12-31",
                  },
                },
              ],
            },
            isLoading: false,
            error: null,
            refetch,
          }
        : path.endsWith("/gestion")
          ? {
              data: { version: "v1", transferEnabled: true, destinations: [] },
              isLoading: false,
              error: null,
              refetch,
            }
          : original(path)) as typeof useFetch);
    render(<StudentDetail id={id} embedded view="matriculas" />);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar de cohorte" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByLabelText("Motivo del cambio de cohorte")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Volver a Matrículas" }));
    expect(screen.getByRole("button", { name: "Cambiar de cohorte" })).toBeInTheDocument();
  });
});
