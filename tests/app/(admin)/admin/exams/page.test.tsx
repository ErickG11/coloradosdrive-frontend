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
    expect(screen.getByText("Motocicletas (Tipo A)")).toBeInTheDocument();
    expect(screen.getByText("Práctica")).toBeInTheDocument();
    expect(screen.getByText("Sí")).toBeInTheDocument();
  });

  it("enlaza a los resultados del examen en Contenido", async () => {
    mockFetchResults({ exams, courses });

    render(<ExamsPage />);

    expect(await screen.findByRole("link", { name: "Resultados" })).toHaveAttribute(
      "href",
      "/admin/content?view=resultados&exam=exam-1",
    );
  });

  it("eliminar exige escribir ELIMINAR y recién entonces llama DELETE /exams/:id", async () => {
    const user = userEvent.setup();
    mockFetchResults({ exams, courses });
    mockedDelete.mockResolvedValue(undefined);

    render(<ExamsPage />);
    await user.click(await screen.findByRole("button", { name: "Eliminar" }));

    const dialog = await screen.findByRole("dialog");
    const confirmButton = within(dialog).getByRole("button", { name: "Eliminar" });
    expect(confirmButton).toBeDisabled();
    expect(mockedDelete).not.toHaveBeenCalled();
    await user.type(within(dialog).getByLabelText(/Escribe ELIMINAR/), "ELIMINAR");
    await user.click(confirmButton);

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith("/exams/exam-1"));
  });
});
