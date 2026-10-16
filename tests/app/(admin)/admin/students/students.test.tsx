import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudentsList from "@/app/(admin)/admin/students/page";
import {
  StudentDetail,
  StudentProfile,
  studentMoney,
} from "@/app/(admin)/admin/students/StudentDetail";
import { useFetch } from "@/hooks/useFetch";
import type { StudentDetail as Detail, StudentList, Course, Cohort } from "@/types";
vi.mock("@/hooks/useFetch", () => ({ useFetch: vi.fn() }));
const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ replace: navigation.replace }),
}));
const id = "11111111-1111-4111-8111-111111111111";
const courseId = "22222222-2222-4222-8222-222222222222";
const cohortId = "33333333-3333-4333-8333-333333333333";
const anotherCourse = "44444444-4444-4444-8444-444444444444";
const refetch = vi.fn();
const course = { id: courseId, nombre: "Curso de prueba", tipo: "A" } as Course;
const cohort = { id: cohortId, courseId, nombre: "Cohorte de prueba" } as Cohort;
const list: StudentList = {
  total: 41,
  page: 1,
  pageSize: 20,
  items: [
    {
      id,
      cedula: "0000000001",
      nombreCompleto: "Alumno ficticio",
      telefono: null,
      activo: false,
      createdAt: "2026-01-01T00:00:00Z",
      matchingEnrollments: [
        { id: "matricula", courseId, courseType: "A", cohortId, status: "activo" },
        {
          id: "pendiente",
          courseId: anotherCourse,
          courseType: "B",
          cohortId: null,
          status: "pendiente_cohorte",
        },
      ],
    },
  ],
};
const detail: Detail = {
  ...list.items[0],
  status: "verificado",
  mustChangePassword: false,
  correo: null,
  correoDisponible: false,
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
      enrollmentId: "pendiente",
      studentId: id,
      courseId,
      courseType: "A",
      cohortId: null,
      status: "pendiente_cohorte",
      fechaInscripcion: "2026-01-01",
      curso: course,
      cohorte: null,
      montoTotal: null,
      montoAbonado: 25,
      saldo: null,
      descuento: 0,
      precioBruto: null,
      documentosPendientes: 1,
      documentos: [
        { tipo: "cedula", estado: "pendiente", fechaMarcado: null, marcadoPor: null },
        { tipo: "tipo_sangre", estado: "entregado", fechaMarcado: null, marcadoPor: null },
        { tipo: "titulo_bachiller", estado: "no_aplica", fechaMarcado: null, marcadoPor: null },
      ],
    },
  ],
};
let state: {
  data: StudentList | null;
  error: string | null;
  isLoading: boolean;
  errorStatus?: number;
};
function mock() {
  vi.mocked(useFetch).mockImplementation(((path: string) => ({
    refetch,
    ...(path.endsWith("/reservas-pendientes")
      ? { data: [], isLoading: false, error: null }
      : path === "/courses"
        ? {
            data: [course, { ...course, id: anotherCourse, nombre: "Otro curso" }],
            error: null,
            isLoading: false,
          }
        : path === "/cohorts"
          ? { data: [cohort], error: null, isLoading: false }
          : { ...state }),
  })) as typeof useFetch);
}
beforeEach(() => {
  vi.clearAllMocks();
  navigation.params = new URLSearchParams();
  state = { data: list, error: null, isLoading: false };
  mock();
});
afterEach(() => vi.useRealTimers());
describe("Alumnos A1", () => {
  it("muestra una sola fila por alumno, matrículas, cohortes, insignias y enlaces sin cédula", () => {
    navigation.params = new URLSearchParams("page=2&activo=false&incluirHistorial=true");
    render(<StudentsList />);
    expect(screen.getAllByText("Alumno ficticio")).toHaveLength(1);
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("Tipo A")).toBeInTheDocument();
    expect(screen.getByText("Tipo B")).toBeInTheDocument();
    expect(screen.getByText("Sin cohorte")).toBeInTheDocument();
    const row = within(screen.getAllByRole("row")[1]);
    expect(row.getByText("Cohorte de prueba")).toBeInTheDocument();
    expect(row.getByText("Desactivado")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Ver ficha de Alumno ficticio" });
    expect(link).toHaveAttribute(
      "href",
      `/admin/students/${id}?page=2&activo=false&incluirHistorial=true`,
    );
    expect(link.getAttribute("href")).not.toContain("0000000001");
  });
  it("reinicia página y limpia la cohorte incompatible al cambiar curso", () => {
    navigation.params = new URLSearchParams(`page=3&courseId=${courseId}&cohortId=${cohortId}`);
    const view = render(<StudentsList />);
    fireEvent.change(screen.getByLabelText("Curso"), { target: { value: anotherCourse } });
    const target = navigation.replace.mock.calls[0][0] as string;
    expect(target).toBe(`/admin/students?page=1&courseId=${anotherCourse}`);
    navigation.params = new URLSearchParams(target.split("?")[1]);
    view.rerender(<StudentsList />);
    expect(
      within(screen.getByLabelText("Cohorte")).queryByText("Cohorte de prueba"),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Estado de la cuenta"), { target: { value: "false" } });
    expect(navigation.replace).toHaveBeenLastCalledWith(
      `/admin/students?page=1&courseId=${anotherCourse}&activo=false`,
      { scroll: false },
    );
  });
  it("espera 350 ms antes de buscar; q nunca se escribe en navegación", async () => {
    vi.useFakeTimers();
    navigation.params = new URLSearchParams("page=2");
    render(<StudentsList />);
    fireEvent.change(screen.getByLabelText("Buscar por nombre, cédula o teléfono"), {
      target: { value: "0000000001" },
    });
    await act(async () => {
      vi.advanceTimersByTime(349);
    });
    expect(vi.mocked(useFetch).mock.calls.some(([path]) => path.includes("q="))).toBe(false);
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(vi.mocked(useFetch).mock.calls.some(([path]) => path.includes("q=0000000001"))).toBe(
      true,
    );
    expect(navigation.replace).toHaveBeenCalledWith("/admin/students?page=1", { scroll: false });
    expect(screen.getByRole("link", { name: /Ver ficha/ }).getAttribute("href")).not.toContain(
      "q=",
    );
  });
  it("pagina conservando filtros", () => {
    navigation.params = new URLSearchParams("activo=false&documentosPendientes=true");
    render(<StudentsList />);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(navigation.replace).toHaveBeenCalledWith(
      "/admin/students?page=2&documentosPendientes=true&activo=false",
      { scroll: false },
    );
  });
  it.each(["carga", "vacío", "error"])("muestra estado %s", (kind) => {
    state =
      kind === "carga"
        ? { data: null, error: null, isLoading: true }
        : kind === "vacío"
          ? { data: { ...list, items: [], total: 0 }, error: null, isLoading: false }
          : { data: null, error: "No se pudo conectar con el servidor.", isLoading: false };
    render(<StudentsList />);
    if (kind === "carga") expect(screen.getByRole("status")).toHaveTextContent("Cargando alumnos");
    if (kind === "vacío")
      expect(screen.getByText("No hay alumnos con esos filtros")).toBeInTheDocument();
    if (kind === "error") {
      expect(screen.getByRole("alert")).toHaveTextContent("No se pudo conectar");
      fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
      expect(refetch).toHaveBeenCalledOnce();
    }
  });
  it("ficha: perfil, correo no disponible, documentos legibles y dinero nulo sin inventar cero", () => {
    render(<StudentProfile student={detail} />);
    expect(screen.getByText("No disponible")).toBeInTheDocument();
    expect(screen.getByText("29/02/2000")).toBeInTheDocument();
    for (const label of ["Total", "Saldo"])
      expect(screen.getByText(label).nextElementSibling).toHaveTextContent("—");
    expect(screen.getByText("Abonado").nextElementSibling).toHaveTextContent(studentMoney(25));
    expect(screen.getByText("Entregado")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText("No aplica")).toBeInTheDocument();
  });
  it("ficha: muestra correo e importes existentes y cohortes", () => {
    render(
      <StudentProfile
        student={{
          ...detail,
          correo: "ficticio@example.test",
          correoDisponible: true,
          enrollments: [
            {
              ...detail.enrollments[0],
              status: "activo",
              montoTotal: 100,
              saldo: 75,
              cohorte: {
                id: cohortId,
                nombre: "Cohorte de prueba",
                fecha_inicio_curso: "2026-01-01",
                fecha_fin_curso: "2026-12-01",
              },
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("ficticio@example.test")).toBeInTheDocument();
    expect(screen.getByText(studentMoney(100))).toBeInTheDocument();
    expect(screen.getByText(studentMoney(75))).toBeInTheDocument();
    expect(screen.getByText("Cohorte de prueba")).toBeInTheDocument();
  });
  it.each([401, 403, 404, 503])("ficha: maneja %s y conserva filtros al volver", (status) => {
    navigation.params = new URLSearchParams("page=3&activo=false&q=privado");
    vi.mocked(useFetch).mockReturnValue({
      data: null,
      error: "Mensaje de la API",
      errorStatus: status,
      isLoading: false,
      refetch,
    });
    render(<StudentDetail id={id} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      status === 404 ? "Alumno no encontrado" : "Mensaje de la API",
    );
    expect(screen.getByRole("link", { name: "Volver a Alumnos" })).toHaveAttribute(
      "href",
      "/admin/students?page=3&activo=false",
    );
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
  it("ficha: muestra la carga y un alumno sin matrículas", () => {
    vi.mocked(useFetch).mockReturnValue({ data: null, error: null, isLoading: true, refetch });
    const view = render(<StudentDetail id={id} />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando ficha");
    vi.mocked(useFetch).mockReturnValue({
      data: { ...detail, enrollments: [] },
      error: null,
      isLoading: false,
      refetch,
    });
    view.rerender(<StudentDetail id={id} />);
    expect(screen.getByText("El alumno no tiene matrículas.")).toBeInTheDocument();
  });
  it("aplica pendientes e historial desde página 3 volviendo a página 1", () => {
    navigation.params = new URLSearchParams("page=3&activo=false");
    render(<StudentsList />);
    fireEvent.change(screen.getByLabelText("Pendientes de cohorte"), { target: { value: "true" } });
    expect(navigation.replace).toHaveBeenLastCalledWith(
      "/admin/students?page=1&pendienteCohorte=true&activo=false",
      { scroll: false },
    );
    fireEvent.click(screen.getByLabelText("Incluir historial de matrículas"));
    expect(navigation.replace).toHaveBeenLastCalledWith(
      "/admin/students?page=1&activo=false&incluirHistorial=true",
      { scroll: false },
    );
  });
});

describe("Búsqueda mejorada", () => {
  it("limpia búsqueda y todos los filtros, incluso valores false", async () => {
    vi.useFakeTimers();
    navigation.params = new URLSearchParams(
      "page=3&activo=false&documentosPendientes=false&incluirHistorial=true",
    );
    render(<StudentsList />);
    fireEvent.change(screen.getByLabelText("Buscar por nombre, cédula o teléfono"), {
      target: { value: "José" },
    });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByLabelText("Buscar por nombre, cédula o teléfono")).toHaveValue("");
    expect(navigation.replace).toHaveBeenLastCalledWith("/admin/students?page=1", {
      scroll: false,
    });
    expect(vi.mocked(useFetch).mock.lastCall?.[0]).not.toContain("q=");
  });
  it("oculta limpiar sin filtros y no inventa requisitos si falta la migración", () => {
    render(<StudentsList />);
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Requisitos" })).toBeInTheDocument();
    expect(screen.getByText("No disponible")).toBeInTheDocument();
  });
  it.each([
    [{ pending: [], unavailable: [] }, "Completo"],
    [{ pending: ["Documentos", "Exámenes"], unavailable: ["Pagos"] }, "2 pendientes"],
    [{ pending: [], unavailable: ["Pagos"] }, "Sin pendientes verificables"],
  ])("muestra el resumen calculado en la consulta %j", (requirements, label) => {
    state.data = { ...list, items: [{ ...list.items[0], requirements }] };
    render(<StudentsList />);
    expect(screen.getByText(label)).toBeInTheDocument();
    if (requirements.unavailable.length)
      expect(screen.getByText("1 sin verificar")).toBeInTheDocument();
  });
  it("muestra el total de cohorte independiente de página y búsqueda", async () => {
    vi.useFakeTimers();
    navigation.params = new URLSearchParams("cohortId=" + cohortId);
    state.data = {
      ...list,
      total: 2,
      cohortSummary: {
        id: cohortId,
        name: "A",
        activeStudents: 25,
        matchingActiveStudents: 2,
        usedCapacity: 26,
        totalCapacity: 30,
      },
    };
    render(<StudentsList />);
    expect(screen.getByText("Cohorte A: 25 alumnos activos (26/30 cupos)")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar por nombre, cédula o teléfono"), {
      target: { value: "José" },
    });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    expect(screen.getByText("Mostrando 2 de 25 alumnos activos")).toBeInTheDocument();
  });
});
