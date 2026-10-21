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

  describe("conflicto de versión (409) y recarga", () => {
    const CONFLICT =
      "La cohorte cambió desde que abriste la edición. Recarga para ver los cambios.";
    const NEW_VERSION = "2026-10-19T15:10:00.654321+00:00";

    it("muestra el aviso literal y «Recargar» trae los datos y la versión actuales", async () => {
      const user = userEvent.setup();
      mockApi([
        cohortDetail(),
        cohortDetail({ nombre: "400 editado por otra persona", updatedAt: NEW_VERSION }),
      ]);
      mockedPatch
        .mockRejectedValueOnce(new ApiError(CONFLICT, 409, { code: "VERSION_CONFLICT" }))
        .mockResolvedValueOnce({});
      render(<EditCohortPage />);

      const nombre = await screen.findByLabelText("Nombre de la cohorte");
      await user.clear(nombre);
      await user.type(nombre, "Mi cambio");
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(CONFLICT);
      expect(pushMock).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Recargar" }));

      expect(await screen.findByRole("status")).toHaveTextContent(
        "Se cargaron los datos actuales de la cohorte.",
      );
      expect(screen.getByLabelText("Nombre de la cohorte")).toHaveValue(
        "400 editado por otra persona",
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Recargar" })).not.toBeInTheDocument();
      expect(mockedGet.mock.calls.filter(([path]) => path === "/cohorts/cohort-1")).toHaveLength(2);

      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      await waitFor(() => expect(mockedPatch).toHaveBeenCalledTimes(2));
      expect((mockedPatch.mock.calls[1][1] as { updatedAt: unknown }).updatedAt).toBe(NEW_VERSION);
      expect(pushMock).toHaveBeenCalledWith("/admin/cohorts");
    });

    it("un 409 de campo se marca en el campo y también ofrece recargar", async () => {
      const user = userEvent.setup();
      mockApi(cohortDetail());
      mockedPatch.mockRejectedValueOnce(
        new ApiError("Ya existe una cohorte con ese nombre en este curso.", 409, {
          code: "COHORT_NAME_DUPLICATE",
          field: "nombre",
        }),
      );
      render(<EditCohortPage />);

      await screen.findByLabelText("Nombre de la cohorte");
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Ya existe una cohorte con ese nombre en este curso.",
      );
      expect(screen.getByLabelText("Nombre de la cohorte")).toHaveAttribute("aria-invalid", "true");
      expect(
        screen.getByText("Si otra persona cambió la cohorte, recarga para ver los datos actuales."),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Recargar" })).toBeInTheDocument();
    });

    it("si falta la versión (400 updatedAt) muestra el aviso general y ofrece recargar", async () => {
      const user = userEvent.setup();
      const message = "Falta la versión de la cohorte. Recarga la página e inténtalo de nuevo.";
      mockApi(cohortDetail());
      mockedPatch.mockRejectedValueOnce(
        new ApiError(message, 400, { code: "INVALID_FIELD", field: "updatedAt" }),
      );
      render(<EditCohortPage />);

      await screen.findByLabelText("Nombre de la cohorte");
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(screen.getByRole("button", { name: "Recargar" })).toBeInTheDocument();
    });

    it("un 400 de validación normal no ofrece recargar", async () => {
      const user = userEvent.setup();
      mockApi(cohortDetail());
      mockedPatch.mockRejectedValueOnce(
        new ApiError("El precio es obligatorio.", 400, { code: "INVALID_FIELD", field: "precio" }),
      );
      render(<EditCohortPage />);

      await screen.findByLabelText("Nombre de la cohorte");
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      await screen.findByRole("alert");
      expect(screen.queryByRole("button", { name: "Recargar" })).not.toBeInTheDocument();
    });

    it("si al recargar la cohorte ya no existe, muestra «No se encontró la cohorte.»", async () => {
      const user = userEvent.setup();
      mockApi([
        cohortDetail(),
        new ApiError("Cohorte no encontrada.", 404, { code: "COHORT_NOT_FOUND" }),
      ]);
      mockedPatch.mockRejectedValueOnce(new ApiError(CONFLICT, 409, { code: "VERSION_CONFLICT" }));
      render(<EditCohortPage />);

      await screen.findByLabelText("Nombre de la cohorte");
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
      await user.click(await screen.findByRole("button", { name: "Recargar" }));

      expect(await screen.findByText("No se encontró la cohorte.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    });
  });
});
