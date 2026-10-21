import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import EditCohortPage from "@/app/(admin)/admin/cohorts/[id]/edit/page";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { CohortDetail, Course } from "@/types";

const pushMock = vi.fn();
const refreshMock = vi.fn();
let routeId = "cohort-1";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: routeId }),
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);
const mockedPatch = vi.mocked(api.patch);

// Versión con microsegundos tal como la entrega PostgREST (contrato L4b).
const VERSION = "2026-10-19T15:04:05.123456+00:00";

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

function cohortDetail(overrides: Partial<CohortDetail> = {}): CohortDetail {
  return {
    id: "cohort-1",
    courseId: "course-b",
    nombre: "400",
    precio: 200,
    cupoMaximo: 20,
    fechaInicioMatricula: "2026-07-01",
    fechaFinMatricula: "2026-07-25",
    fechaInicioCurso: "2026-08-01",
    fechaFinCurso: "2026-09-04",
    tipoModalidad: null,
    horariosCapacitacionTeoria: null,
    numeroVehiculos: null,
    numeroAulas: 0,
    createdAt: "2026-06-01T10:00:00.000000+00:00",
    updatedAt: VERSION,
    alumnos: { total: 0, activos: 0, finalizados: 0, retirados: 0 },
    ...overrides,
  };
}

// Responde a cada GET según la ruta; `cohort` puede ser una lista de
// respuestas sucesivas (para simular la recarga tras un conflicto).
function mockApi(cohort: CohortDetail | Error | (CohortDetail | Error)[]) {
  const queue = Array.isArray(cohort) ? [...cohort] : null;
  mockedGet.mockImplementation((path: string) => {
    if (path === "/courses") return Promise.resolve(courses);
    if (path.startsWith("/cohorts/")) {
      const next = queue ? (queue.length > 1 ? queue.shift() : queue[0]) : cohort;
      return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
    }
    return Promise.reject(new Error(`unexpected GET ${path}`));
  });
}

describe("EditCohortPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeId = "cohort-1";
  });

  it("carga la cohorte con GET /cohorts/:id (no la lista) y prellena el formulario", async () => {
    mockApi(cohortDetail());
    render(<EditCohortPage />);

    expect(await screen.findByLabelText("Nombre de la cohorte")).toHaveValue("400");
    expect(screen.getByLabelText("Curso")).toHaveValue("course-b");
    expect(screen.getByLabelText("Número de aulas")).toHaveValue(0);
    expect(mockedGet).toHaveBeenCalledWith("/cohorts/cohort-1");
    expect(mockedGet).not.toHaveBeenCalledWith("/cohorts");
  });

  it("envía en el PATCH la versión (updatedAt) como cadena exacta", async () => {
    const user = userEvent.setup();
    mockApi(cohortDetail());
    mockedPatch.mockResolvedValue({});
    render(<EditCohortPage />);

    await screen.findByLabelText("Nombre de la cohorte");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mockedPatch).toHaveBeenCalledTimes(1));
    const [path, body] = mockedPatch.mock.calls[0];
    expect(path).toBe("/cohorts/cohort-1");
    expect((body as { updatedAt: unknown }).updatedAt).toBe(VERSION);
    expect(pushMock).toHaveBeenCalledWith("/admin/cohorts");
  });

  it.each([
    ["404 (no existe)", new ApiError("Cohorte no encontrada.", 404, { code: "COHORT_NOT_FOUND" })],
    [
      "400 (id inválido)",
      new ApiError("La cohorte indicada no es válida.", 400, {
        code: "INVALID_FIELD",
        field: "id",
      }),
    ],
  ])("con %s muestra «No se encontró la cohorte.» sin formulario", async (_name, apiError) => {
    routeId = "abc";
    mockApi(apiError);
    render(<EditCohortPage />);

    expect(await screen.findByText("No se encontró la cohorte.")).toHaveAttribute("role", "alert");
    expect(screen.queryByText(apiError.message)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Editar cohorte" })).toBeInTheDocument();
  });

  it("otros errores de carga muestran su mensaje", async () => {
    mockApi(new ApiError("Error interno del servidor. Intenta más tarde.", 500));
    render(<EditCohortPage />);

    expect(
      await screen.findByText("Error interno del servidor. Intenta más tarde."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No se encontró la cohorte.")).not.toBeInTheDocument();
  });

  it("codifica el id en la ruta del GET", async () => {
    routeId = "a/b";
    mockApi(new ApiError("La cohorte indicada no es válida.", 400, { field: "id" }));
    render(<EditCohortPage />);

    await screen.findByText("No se encontró la cohorte.");
    expect(mockedGet).toHaveBeenCalledWith("/cohorts/a%2Fb");
  });
});
