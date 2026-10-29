import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentPendingRatings } from "@/components/practice-ratings/StudentPendingRatings";
import { usePendingPracticeRatings } from "@/hooks/usePendingPracticeRatings";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { PendingPracticeRating } from "@/types/practiceRating";

const replace = vi.hoisted(() => vi.fn());
const query = vi.hoisted(() => ({ value: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(query.value),
}));
vi.mock("@/hooks/usePendingPracticeRatings", () => ({ usePendingPracticeRatings: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn() } }));

const refetch = vi.fn();
const practice: PendingPracticeRating = {
  practiceSlotId: "11111111-1111-4111-8111-111111111111",
  instructorName: "Ana Torres",
  scheduledAt: "2026-10-28T14:00:00Z",
  opensAt: "2026-10-28T15:05:00Z",
  closesAt: "2026-10-29T15:05:00Z",
};
const post = vi.mocked(api.post);
const pending = vi.mocked(usePendingPracticeRatings);

describe("encuestas pendientes del alumno", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.value = "";
    pending.mockReturnValue({ items: [practice], isLoading: false, error: null, refetch });
    post.mockResolvedValue({
      id: "rating",
      practiceSlotId: practice.practiceSlotId,
      score: 5,
      comment: null,
      createdAt: "2026-10-28T16:00:00Z",
    });
  });

  it("muestra pendientes y vacío", () => {
    const view = render(<StudentPendingRatings />);
    expect(screen.getByRole("heading", { name: "Encuestas pendientes" })).toBeInTheDocument();
    expect(screen.getByText("Ana Torres")).toBeInTheDocument();
    expect(screen.getByText(/restantes|Plazo por actualizar/)).toBeInTheDocument();
    pending.mockReturnValue({ items: [], isLoading: false, error: null, refetch });
    view.rerender(<StudentPendingRatings />);
    expect(screen.getByText("No tienes encuestas pendientes.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Calificar" })).not.toBeInTheDocument();
  });

  it("muestra carga y permite reintentar un fallo de lista", async () => {
    pending.mockReturnValue({ items: [], isLoading: true, error: null, refetch });
    const view = render(<StudentPendingRatings />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando encuestas");
    pending.mockReturnValue({ items: [], isLoading: false, error: "falló", refetch });
    view.rerender(<StudentPendingRatings />);
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos consultar");
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("valida estrellas y longitud, envía y refresca", async () => {
    const user = userEvent.setup();
    render(<StudentPendingRatings />);
    await user.click(screen.getByRole("button", { name: "Calificar" }));
    expect(screen.getByRole("button", { name: "Enviar calificación" })).toBeDisabled();
    const comment = screen.getByRole("textbox", { name: "Comentario (opcional)" });
    fireEvent.change(comment, { target: { value: "x".repeat(1001) } });
    expect(screen.getByText("El comentario admite máximo 1000 caracteres.")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "5 estrellas" }));
    expect(screen.getByRole("button", { name: "Enviar calificación" })).toBeDisabled();
    fireEvent.change(comment, { target: { value: "  Muy buena práctica  " } });
    await user.click(screen.getByRole("button", { name: "Enviar calificación" }));
    await waitFor(() => expect(post).toHaveBeenCalledOnce());
    expect(post).toHaveBeenCalledWith("/estudiantes/practice-ratings", {
      practiceSlotId: practice.practiceSlotId,
      score: 5,
      comment: "Muy buena práctica",
    });
    expect(await screen.findByText(/Gracias, tu calificación se envió/)).toBeInTheDocument();
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("permite elegir estrellas con teclado", async () => {
    const user = userEvent.setup();
    render(<StudentPendingRatings />);
    await user.click(screen.getByRole("button", { name: "Calificar" }));
    screen.getByRole("radio", { name: "1 estrella" }).focus();
    await user.keyboard("{Space}{ArrowRight}");
    expect(screen.getByRole("radio", { name: "2 estrellas" })).toBeChecked();
  });

  it("el aviso no abre encuesta si la API no la confirma", async () => {
    query.value = `calificar=${practice.practiceSlotId}`;
    pending.mockReturnValue({ items: [], isLoading: false, error: null, refetch });
    const view = render(<StudentPendingRatings />);
    expect(screen.queryByRole("dialog", { name: "Calificar práctica" })).not.toBeInTheDocument();
    expect(screen.getByText(/Esta encuesta ya no está disponible/)).toBeInTheDocument();
    pending.mockReturnValue({ items: [practice], isLoading: false, error: null, refetch });
    view.rerender(<StudentPendingRatings />);
    expect(screen.getByRole("dialog", { name: "Calificar práctica" })).toBeInTheDocument();
    await userEvent.setup().click(screen.getAllByRole("button", { name: "Cerrar" })[0]);
    expect(replace).toHaveBeenCalledWith("/student");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Calificar práctica" })).not.toBeInTheDocument(),
    );
  });

  it.each([
    ["RATING_ALREADY_SUBMITTED", "Ya calificaste"],
    ["RATING_WINDOW_CLOSED", "Terminó el plazo"],
    ["RATING_NOT_ELIGIBLE", "ya no está habilitada"],
    ["PRACTICE_NOT_FOUND", "ya no está disponible"],
  ])("muestra %s y refresca pendientes", async (code, message) => {
    post.mockRejectedValue(
      new ApiError("mensaje interno", code === "PRACTICE_NOT_FOUND" ? 404 : 409, { code }),
    );
    const user = userEvent.setup();
    render(<StudentPendingRatings />);
    await user.click(screen.getByRole("button", { name: "Calificar" }));
    await user.click(screen.getByRole("radio", { name: "3 estrellas" }));
    await user.click(screen.getByRole("button", { name: "Enviar calificación" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(refetch).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Enviar calificación" })).toBeDisabled();
  });

  it.each([
    [403, "RATING_FORBIDDEN", "no tiene permiso"],
    [400, "INVALID_FIELD", "Revisa la calificación"],
  ])("muestra %s sin filtrar mensajes internos", async (status, code, message) => {
    post.mockRejectedValue(new ApiError("mensaje interno", status, { code }));
    const user = userEvent.setup();
    render(<StudentPendingRatings />);
    await user.click(screen.getByRole("button", { name: "Calificar" }));
    await user.click(screen.getByRole("radio", { name: "3 estrellas" }));
    await user.click(screen.getByRole("button", { name: "Enviar calificación" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("alert")).not.toHaveTextContent("mensaje interno");
    expect(refetch).not.toHaveBeenCalled();
  });
});
