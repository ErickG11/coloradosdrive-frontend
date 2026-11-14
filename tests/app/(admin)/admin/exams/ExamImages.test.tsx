import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExamForm, examToFormValues } from "@/app/(admin)/admin/exams/ExamForm";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Course, ExamWithQuestions, Question } from "@/types";
import { pngFile } from "../../../../helpers/questionImages";
vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const get = vi.mocked(api.get),
  post = vi.mocked(api.post),
  patch = vi.mocked(api.patch),
  remove = vi.mocked(api.delete);
const courses: Course[] = [
  { id: "course-a", nombre: "Curso A", tipo: "A", descripcion: null, createdAt: "", updatedAt: "" },
];
const image = { url: "https://signed.example.invalid/one?token=private", alt: "Señal roja" };
const question: Question = {
  id: "q-saved",
  examId: "exam-saved",
  type: "opcion_multiple",
  prompt: "¿Qué indica?",
  points: 1,
  orderIndex: 1,
  correctAnswerText: null,
  synonyms: [],
  options: [
    { id: "a", questionId: "q-saved", optionText: "A", isCorrect: true, orderIndex: 1 },
    { id: "b", questionId: "q-saved", optionText: "B", isCorrect: false, orderIndex: 2 },
  ],
  image: null,
};
const template: ExamWithQuestions = {
  id: "exam-saved",
  courseId: "course-a",
  title: "Examen",
  type: "practica",
  timeLimitMinutes: 30,
  passingScorePercent: 70,
  isPublished: false,
  createdAt: "",
  updatedAt: "",
  questions: [question],
};
const endpoint = "/admin/exams/exam-saved/questions/q-saved/image";
let server: ExamWithQuestions;
const oldCreate = URL.createObjectURL,
  oldRevoke = URL.revokeObjectURL;
beforeEach(() => {
  vi.resetAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:local-question");
  URL.revokeObjectURL = vi.fn();
  server = { ...template, questions: [{ ...question }] };
  get.mockImplementation(() => Promise.resolve(server));
  patch.mockImplementation((path, body) => {
    if (path === endpoint) {
      server = {
        ...server,
        questions: [{ ...question, image: { ...image, alt: (body as { alt: string }).alt } }],
      };
      return Promise.resolve(server.questions[0]);
    }
    if (path === "/exams/exam-saved") server = { ...server, ...(body as object) };
    return Promise.resolve(server);
  });
  remove.mockImplementation(() => {
    server = { ...server, questions: [{ ...question, image: null }] };
    return Promise.resolve(undefined);
  });
  post.mockImplementation((path) => {
    if (path === "/exams") return Promise.resolve({ ...server });
    if (path === endpoint) {
      server = { ...server, questions: [{ ...question, image }] };
      return Promise.resolve(server.questions[0]);
    }
    return Promise.reject(new Error("Petición inesperada"));
  });
});
afterEach(() => {
  cleanup();
  URL.createObjectURL = oldCreate;
  URL.revokeObjectURL = oldRevoke;
});
async function choose(user: ReturnType<typeof userEvent.setup>, file = pngFile()) {
  await user.upload(screen.getByLabelText("Seleccionar imagen para pregunta 1"), file);
  await waitFor(() => expect(screen.queryByText("Comprobando imagen…")).not.toBeInTheDocument());
}
function fillNew() {
  fireEvent.change(screen.getByLabelText("Curso"), { target: { value: "course-a" } });
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Examen" } });
  fireEvent.change(screen.getByLabelText("Tiempo límite (minutos)"), { target: { value: "30" } });
  fireEvent.change(screen.getByLabelText("Pregunta 1 - Enunciado"), {
    target: { value: "¿Qué indica?" },
  });
  fireEvent.change(screen.getByLabelText("Pregunta 1 - Opción 1"), { target: { value: "A" } });
  fireEvent.change(screen.getByLabelText("Pregunta 1 - Opción 2"), { target: { value: "B" } });
}
describe("imágenes del constructor", () => {
  it("sube después del POST y relectura con ids; publica después de subir", async () => {
    const user = userEvent.setup();
    render(<ExamForm courses={courses} />);
    fillNew();
    await choose(user);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(post).not.toHaveBeenCalled();
    await user.type(
      screen.getByLabelText("Pregunta 1 - Descripción de la imagen (accesibilidad)"),
      "Señal roja",
    );
    await user.click(screen.getByRole("button", { name: "Guardar y publicar" }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/exams/exam-saved", { isPublished: true }),
    );
    const uploads = post.mock.calls.filter(([path]) => path === endpoint);
    expect(uploads).toHaveLength(1);
    const multipart = uploads[0][1] as FormData;
    expect(multipart.get("alt")).toBe("Señal roja");
    expect((multipart.get("image") as File).name).toBe("pregunta.png");
    expect(post.mock.invocationCallOrder[0]).toBeLessThan(get.mock.invocationCallOrder[0]);
    expect(get.mock.invocationCallOrder[0]).toBeLessThan(post.mock.invocationCallOrder[1]);
    expect(post.mock.invocationCallOrder[1]).toBeLessThan(patch.mock.invocationCallOrder[0]);
    await waitFor(() => expect(screen.getByText("Publicado")).toBeInTheDocument());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-question");
  });
  it("fallo parcial mantiene archivo e ids; reintentar no crea de nuevo ni publica", async () => {
    const user = userEvent.setup();
    let failed = false;
    post.mockImplementation((path) => {
      if (path === "/exams") return Promise.resolve(server);
      if (!failed) {
        failed = true;
        return Promise.reject(new ApiError("privado", 503, { code: "IMAGE_UPLOAD_FAILED" }));
      }
      server = { ...server, questions: [{ ...question, image }] };
      return Promise.resolve(server.questions[0]);
    });
    render(<ExamForm courses={courses} />);
    fillNew();
    await choose(user);
    await user.click(screen.getByRole("button", { name: "Guardar y publicar" }));
    expect(
      await screen.findByText(/Examen guardado como borrador. Hay imágenes pendientes/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Guardado, pero la imagen de la pregunta 1/)).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Reintentar imagen pendiente 1" }));
    await waitFor(() =>
      expect(screen.queryByText(/Hay imágenes pendientes/)).not.toBeInTheDocument(),
    );
    expect(post.mock.calls.filter(([path]) => path === "/exams")).toHaveLength(1);
    expect(post.mock.calls.filter(([path]) => path === endpoint)).toHaveLength(2);
    expect(patch).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Pregunta 1 - Enunciado")).toHaveValue("¿Qué indica?");
  });
  it("publicado bloquea imagen y alt; congelado permite únicamente alt tras despublicar", async () => {
    const user = userEvent.setup();
    server = { ...server, isPublished: true, questions: [{ ...question, image }] };
    const { rerender } = render(
      <ExamForm
        key="published"
        courses={courses}
        examId={server.id}
        initialValues={examToFormValues(server)}
        hasAttempts
      />,
    );
    expect(screen.getByText("Despublica para editar.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reemplazar imagen de la pregunta 1" }),
    ).toBeDisabled();
    expect(
      screen.getByLabelText("Pregunta 1 - Descripción de la imagen (accesibilidad)"),
    ).toBeDisabled();
    server = { ...server, isPublished: false };
    rerender(
      <ExamForm
        key="draft"
        courses={courses}
        examId={server.id}
        initialValues={examToFormValues(server)}
        hasAttempts
      />,
    );
    expect(screen.getByRole("button", { name: "Quitar imagen de la pregunta 1" })).toBeDisabled();
    const alt = screen.getByLabelText("Pregunta 1 - Descripción de la imagen (accesibilidad)");
    expect(alt).toBeEnabled();
    await user.clear(alt);
    await user.type(alt, "Texto corregido");
    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith(endpoint, { alt: "Texto corregido" }));
    expect(post).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(patch.mock.calls).toHaveLength(1);
  });
  it("quitar exige confirmación ligera y solo elimina al guardar", async () => {
    const user = userEvent.setup();
    server = { ...server, questions: [{ ...question, image }] };
    render(
      <ExamForm courses={courses} examId={server.id} initialValues={examToFormValues(server)} />,
    );
    await user.click(screen.getByRole("button", { name: "Quitar imagen de la pregunta 1" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Confirmar cambio de imagen",
      }),
    );
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByText("La imagen se quitará al guardar.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(endpoint));
  });
  it("rechaza SVG renombrado antes de subir y libera vista local al desmontar", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ExamForm courses={courses} />);
    await choose(user, new File(["<svg/>"], "falsa.png", { type: "image/png" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/SVG no está permitido/);
    expect(post).not.toHaveBeenCalled();
    await choose(user);
    await screen.findByText(/Archivo seleccionado/);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-question");
  });
  it("duplicar no copia la imagen y la vista previa no revela claves", async () => {
    const user = userEvent.setup();
    server = { ...server, questions: [{ ...question, image }] };
    render(
      <ExamForm courses={courses} examId={server.id} initialValues={examToFormValues(server)} />,
    );
    await user.click(screen.getByRole("button", { name: "Duplicar Pregunta 1" }));
    expect(screen.getAllByRole("figure")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Agregar imagen a la pregunta 2" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Vista previa del alumno" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByAltText("Señal roja")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/es correcta/)).not.toBeInTheDocument();
  });
  it("conflicto exige recargar la imagen conservando otros textos del formulario", async () => {
    const user = userEvent.setup();
    post.mockRejectedValue(new ApiError("SQL privado", 409, { code: "IMAGE_CONFLICT" }));
    render(
      <ExamForm courses={courses} examId={server.id} initialValues={examToFormValues(server)} />,
    );
    await choose(user);
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Texto local" } });
    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
    await screen.findByRole("button", { name: "Recargar imagen de la pregunta 1" });
    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
    expect(post.mock.calls.filter(([path]) => path === endpoint)).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Otro texto sin guardar" },
    });
    await user.click(
      await screen.findByRole("button", { name: "Recargar imagen de la pregunta 1" }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Confirmar cambio de imagen",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Título")).toHaveValue("Otro texto sin guardar");
    expect(screen.queryByText("SQL privado")).not.toBeInTheDocument();
  });
});
