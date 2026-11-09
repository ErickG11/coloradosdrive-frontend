import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StudentCourse } from "@/components/student-content/StudentCourse";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { StudentItem } from "@/types/studentContent";

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);

function buildItem(overrides: Partial<StudentItem> = {}): StudentItem {
  return {
    id: "item-1",
    subject_id: "subject-1",
    kind: "examen",
    material_id: null,
    exam_id: "exam-1",
    order_index: 1,
    obligatorio: true,
    title: "Examen de práctica - Señales",
    description: null,
    completado: false,
    access: {
      estado: "abierto",
      fuente: "cohorte",
      opens_at: null,
      closes_at: null,
      max_attempts: null,
      extra_minutes: 0,
    },
    intentos_usados: 0,
    intentos_permitidos: null,
    mejor_nota: null,
    intento_en_progreso: null,
    ...overrides,
  };
}

function mockCourse(
  items: StudentItem[],
  courses = [{ course_id: "c1", nombre: "Curso A", tipo: "B" }],
) {
  mockedGet.mockImplementation((path: unknown) => {
    if (path === "/estudiantes/content/courses") return Promise.resolve(courses);
    if (typeof path === "string" && path.startsWith("/estudiantes/content/course?")) {
      return Promise.resolve({
        course_id: "c1",
        materias: [
          {
            id: "subject-1",
            course_id: "c1",
            title: "Señales",
            description: null,
            order_index: 1,
            is_published: true,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
            items,
          },
        ],
        progreso: {
          materias: [
            {
              subject_id: "subject-1",
              title: "Señales",
              obligatorios_totales: items.length,
              completados: 0,
              porcentaje: 0,
              completa: false,
            },
          ],
          global: 0,
          completa: false,
          sin_contenido: items.length === 0,
          certificado_listo: false,
        },
        continuar: null,
        server_now: "2026-01-02T00:00:00Z",
      });
    }
    return Promise.reject(new Error(`api.get mockeado con un path inesperado: ${String(path)}`));
  });
}

describe("StudentCourse (exámenes del alumno)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el estado de carga", () => {
    mockedGet.mockReturnValue(new Promise(() => {}));

    render(<StudentCourse />);

    expect(screen.getByRole("status", { name: "Cargando contenido" })).toBeInTheDocument();
  });

  it("muestra el error si falla la carga", async () => {
    mockedGet.mockRejectedValue(new ApiError("No tienes permisos para realizar esta acción.", 403));

    render(<StudentCourse />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tu cuenta no tiene acceso a este contenido",
    );
  });

  it("muestra un mensaje cuando no hay cursos habilitados", async () => {
    mockCourse([], []);

    render(<StudentCourse />);

    expect(await screen.findByText(/Aún no tienes un curso habilitado/)).toBeInTheDocument();
  });

  it("examen sin intentos: muestra Disponible y Rendir examen con el curso en el enlace", async () => {
    mockCourse([buildItem()]);

    render(<StudentCourse />);

    expect(await screen.findByText("Disponible")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Rendir examen/ })).toHaveAttribute(
      "href",
      "/student/exams/exam-1?course_id=c1",
    );
    expect(screen.queryByRole("link", { name: "Ver resultado" })).not.toBeInTheDocument();
  });

  it("intento en curso: muestra Continuar intento", async () => {
    mockCourse([
      buildItem({
        intentos_usados: 1,
        intento_en_progreso: { id: "attempt-1", deadline_at: "2026-01-02T01:00:00Z" },
      }),
    ]);

    render(<StudentCourse />);

    expect(await screen.findByText("Tu intento sigue en curso")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continuar intento/ })).toBeInTheDocument();
  });

  it("definitivo aprobado y sin intentos restantes: muestra la nota, Ver resultado y no ofrece reintentar", async () => {
    mockCourse([buildItem({ intentos_usados: 1, intentos_permitidos: 1, mejor_nota: 90 })]);

    render(<StudentCourse />);

    expect(await screen.findByRole("link", { name: "Ver resultado" })).toBeInTheDocument();
    expect(screen.getByText("No quedan intentos disponibles.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Rendir examen/ })).not.toBeInTheDocument();
  });

  it("práctica con intentos ilimitados: tras un intento sigue ofreciendo rendir de nuevo", async () => {
    mockCourse([buildItem({ intentos_usados: 2, intentos_permitidos: null, mejor_nota: 50 })]);

    render(<StudentCourse />);

    expect(await screen.findByRole("link", { name: /Rendir examen/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver resultado" })).toBeInTheDocument();
  });

  it("examen no abierto: no ofrece iniciar", async () => {
    mockCourse([
      buildItem({
        access: {
          estado: "programado",
          fuente: "cohorte",
          opens_at: "2026-02-01T00:00:00Z",
          closes_at: null,
          max_attempts: null,
          extra_minutes: 0,
        },
      }),
    ]);

    render(<StudentCourse />);

    expect(await screen.findByText("El examen no está abierto para iniciar.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Rendir examen/ })).not.toBeInTheDocument();
  });

  it("consulta el catálogo del curso seleccionado (GET /estudiantes/content/course)", async () => {
    mockCourse([buildItem()]);

    render(<StudentCourse />);

    await screen.findByText("Disponible");
    expect(mockedGet).toHaveBeenCalledWith(
      "/estudiantes/content/course?course_id=c1",
      expect.anything(),
    );
  });
});
