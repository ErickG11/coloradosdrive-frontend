import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ExamsPage from "@/app/(admin)/admin/exams/page";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Course, Exam } from "@/types";

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), delete: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);
const mockedDelete = vi.mocked(api.delete);

const exams: Exam[] = [
  {
    id: "exam-1",
    courseId: "course-a",
    title: "Examen de práctica - Señales",
    type: "practica",
    timeLimitMinutes: 30,
    passingScorePercent: 70,
    isPublished: true,
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-01-15T00:00:00Z",
  },
];

const courses: Course[] = [
  {
    id: "course-a",
    nombre: "Motocicletas",
    tipo: "A",
    descripcion: null,
    createdAt: "",
    updatedAt: "",
  },
];

// La pantalla carga con useContentResource (api.get), no con useFetch.
function mockFetchResults(options: { exams?: Exam[] | Error; courses?: Course[] | Error }) {
  const respond = (value: Exam[] | Course[] | Error | undefined) =>
    value instanceof Error ? Promise.reject(value) : Promise.resolve(value ?? []);
  mockedGet.mockImplementation((path: unknown) => {
    if (path === "/exams") return respond(options.exams);
    if (path === "/courses") return respond(options.courses);
    if (String(path).endsWith("/subjects")) return Promise.resolve([]);
    if (path === "/exams/exam-1") return Promise.resolve({ ...exams[0], questions: [] });
    if (String(path).endsWith("/results")) return Promise.resolve([]);
    throw new Error(`api.get mockeado con un path inesperado: ${String(path)}`);
  });
}

describe("ExamsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el estado de carga", () => {
    mockedGet.mockReturnValue(new Promise(() => {}));

    render(<ExamsPage />);

    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("muestra el error si falla la carga y ofrece reintentar", async () => {
    mockFetchResults({ exams: new ApiError("Caída", 500) });

    render(<ExamsPage />);

    expect(
      await screen.findByText("No se pudo conectar con Contenido. Intenta de nuevo."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar carga" })).toBeInTheDocument();
  });

  it("muestra un mensaje cuando no hay exámenes", async () => {
    mockFetchResults({});

    render(<ExamsPage />);

    expect(await screen.findByText("Todavía no hay exámenes.")).toBeInTheDocument();
  });

  it("renderiza el examen con el curso unido del lado del cliente, tipo y estado de publicación", async () => {
    mockFetchResults({ exams, courses });

    render(<ExamsPage />);

    expect(await screen.findByText("Examen de práctica - Señales")).toBeInTheDocument();
    expect(
      within(screen.getByRole("article")).getByText("Motocicletas (Tipo A)"),
    ).toBeInTheDocument();
    expect(within(screen.getByRole("article")).getByText("Práctica")).toBeInTheDocument();
    expect(
      within(screen.getByRole("article")).getByText("Publicado", { selector: "span" }),
    ).toBeInTheDocument();
  });

  it("enlaza a los resultados del examen en Contenido", async () => {
    mockFetchResults({ exams, courses });

    render(<ExamsPage />);

    expect(await screen.findByRole("link", { name: "Resultados" })).toHaveAttribute(
      "href",
      "/admin/content?view=resultados&exam=exam-1",
    );
  });

  it("enriquece el curso seleccionado con preguntas, puntos, intentos y disponibilidad", async () => {
    mockedGet.mockImplementation((path) => {
      if (path === "/exams") return Promise.resolve(exams);
      if (path === "/courses") return Promise.resolve(courses);
      if (String(path).endsWith("/subjects"))
        return Promise.resolve([{ id: "s", title: "Seguridad vial", is_published: true }]);
      if (String(path).endsWith("/items"))
        return Promise.resolve([{ id: "item", subject_id: "s", exam_id: "exam-1" }]);
      if (String(path).endsWith("/rules"))
        return Promise.resolve([{ habilitado: true, opens_at: null, closes_at: null }]);
      if (String(path).endsWith("/results"))
        return Promise.resolve([{ intentos_usados: 3 }, { intentos_usados: 2 }]);
      if (path === "/exams/exam-1")
        return Promise.resolve({ ...exams[0], questions: [{ points: 2 }, { points: 3 }] });
      throw Error(String(path));
    });
    render(<ExamsPage />);
    expect(await screen.findByText("Listo para alumnos habilitados")).toBeInTheDocument();
    const card = within(screen.getByRole("article"));
    expect(card.getByText("2 · 5")).toBeInTheDocument();
    expect(card.getByText("5", { selector: "strong" })).toBeInTheDocument();
    expect(card.getByText("∞")).toBeInTheDocument();
    expect(card.getByText("Materia: Seguridad vial")).toBeInTheDocument();
    expect(card.getByRole("link", { name: /Ir a Contenido/ })).toHaveAttribute(
      "href",
      "/admin/content?exam=exam-1",
    );
    expect(mockedGet).toHaveBeenCalledTimes(7); // 2 base + subjects + items + details + results + rules
    expect(screen.getByText(/cada alumno necesita una matrícula elegible/)).toBeInTheDocument();
  });

  it("busca sin tildes y combina filtros locales sin nuevas solicitudes", async () => {
    const user = userEvent.setup();
    const list = [
      ...exams,
      {
        ...exams[0],
        id: "exam-2",
        title: "Final",
        type: "definitivo" as const,
        isPublished: false,
      },
    ];
    mockFetchResults({ exams: list, courses });
    render(<ExamsPage />);
    await screen.findByRole("article", { name: "Final" });
    await waitFor(() =>
      expect(screen.queryByText(/Verificando preguntas/)).not.toBeInTheDocument(),
    );
    const count = mockedGet.mock.calls.length;
    await user.type(screen.getByLabelText("Buscar examen"), "senales");
    expect(screen.queryByRole("article", { name: "Final" })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: exams[0].title })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Estado"), "borrador");
    expect(screen.getByText("No hay exámenes que coincidan")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await user.selectOptions(screen.getByLabelText("Tipo"), "definitivo");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("article", { name: "Final" })).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledTimes(count);
  });

  it("un fallo de detalles conserva editar/resultados y permite reintentar sin afirmar acceso", async () => {
    const user = userEvent.setup();
    mockFetchResults({ exams, courses });
    const original = mockedGet.getMockImplementation()!;
    mockedGet.mockImplementation((path, options) =>
      String(path).endsWith("/subjects")
        ? Promise.reject(new ApiError("SQL interno", 500))
        : original(path, options),
    );
    render(<ExamsPage />);
    expect(await screen.findByRole("button", { name: "Reintentar detalles" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Editar ${exams[0].title}` })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resultados" })).toBeInTheDocument();
    expect(screen.getByText("Disponibilidad por verificar")).toBeInTheDocument();
    expect(screen.queryByText("SQL interno")).not.toBeInTheDocument();
    mockedGet.mockImplementation(original);
    await user.click(screen.getByRole("button", { name: "Reintentar detalles" }));
    expect(await screen.findByText("Faltan preguntas")).toBeInTheDocument();
  });

  it("eliminar exige escribir ELIMINAR y recién entonces llama DELETE /exams/:id", async () => {
    const user = userEvent.setup();
    mockFetchResults({ exams, courses });
    mockedDelete.mockResolvedValue(undefined);

    render(<ExamsPage />);
    await user.click(
      await screen.findByLabelText(`Acciones de ${exams[0].title}`, { selector: "summary" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));

    const dialog = await screen.findByRole("dialog");
    const confirmButton = within(dialog).getByRole("button", { name: "Eliminar" });
    expect(confirmButton).toBeDisabled();
    expect(mockedDelete).not.toHaveBeenCalled();
    await user.type(within(dialog).getByLabelText(/Escribe ELIMINAR/), "ELIMINAR");
    await user.click(confirmButton);

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith("/exams/exam-1"));
  });
});
