import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuestionImage } from "@/components/exams/QuestionImage";
import { ApiError } from "@/lib/api/errors";

const image = { url: "https://signed.example.invalid/one?token=private", alt: "Señal de pare" };
describe("QuestionImage", () => {
  it("reconoce una imagen que termino de cargar antes de hidratar", () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    const width = vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(640);
    try {
      render(<QuestionImage image={image} index={0} eager />);
      expect(screen.queryByRole("status", { name: /Cargando imagen/ })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ampliar imagen de la pregunta 1" })).toBeEnabled();
    } finally {
      complete.mockRestore();
      width.mockRestore();
    }
  });
  it("reserva espacio, usa eager en la primera y proporciona alt alternativo", () => {
    render(<QuestionImage image={{ ...image, alt: " " }} index={0} eager />);
    const picture = screen.getByAltText("Imagen de la pregunta 1");
    expect(picture).toHaveAttribute("loading", "eager");
    expect(
      screen.getByRole("status", { name: "Cargando imagen de la pregunta 1" }),
    ).toBeInTheDocument();
    fireEvent.load(picture);
    expect(screen.queryByRole("status", { name: /Cargando imagen/ })).not.toBeInTheDocument();
  });
  it("abre por teclado, atrapa foco, Escape cierra y devuelve foco sin enviar formularios", async () => {
    const user = userEvent.setup(),
      submit = vi.fn();
    render(
      <form onSubmit={submit}>
        <QuestionImage image={image} index={0} eager />
      </form>,
    );
    fireEvent.load(screen.getByAltText(image.alt));
    const trigger = screen.getByRole("button", { name: "Ampliar imagen de la pregunta 1" });
    trigger.focus();
    await user.keyboard("{Enter}");
    const dialog = screen.getByRole("dialog", { name: "Imagen de la pregunta 1" });
    expect(within(dialog).getByAltText(image.alt)).toBeInTheDocument();
    await user.tab();
    expect(within(dialog).getByRole("button", { name: "Cerrar" })).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole("button", { name: "Cerrar" })).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(submit).not.toHaveBeenCalled();
  });
  it("onError no renueva automáticamente; reintento explícito deduplicado y URL actualizada", async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const retry = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const { rerender } = render(<QuestionImage image={image} index={0} onRetry={retry} />);
    fireEvent.error(screen.getByAltText(image.alt));
    expect(retry).not.toHaveBeenCalled();
    const button = screen.getByRole("button", { name: "Reintentar imagen de la pregunta 1" });
    await user.click(button);
    await user.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
    rerender(
      <QuestionImage
        image={{ ...image, url: "https://signed.example.invalid/renewed" }}
        index={0}
        onRetry={retry}
      />,
    );
    resolve();
    expect(await screen.findByAltText(image.alt)).toHaveAttribute(
      "src",
      "https://signed.example.invalid/renewed",
    );
  });
  it("muestra expiración en español sin datos privados", async () => {
    const user = userEvent.setup();
    const retry = vi
      .fn()
      .mockRejectedValue(new ApiError("TOKEN_PRIVADO", 409, { code: "ATTEMPT_EXPIRED" }));
    render(<QuestionImage image={image} index={1} onRetry={retry} />);
    fireEvent.error(screen.getByAltText(image.alt));
    await user.click(screen.getByRole("button", { name: "Reintentar imagen de la pregunta 2" }));
    expect(await screen.findByText(/Ya no se pueden renovar/)).toBeInTheDocument();
    expect(screen.queryByText("TOKEN_PRIVADO")).not.toBeInTheDocument();
  });
  it("la vista previa puede mostrar imagen sin otro diálogo anidado", () => {
    render(<QuestionImage image={image} index={0} expandable={false} />);
    expect(screen.getByAltText(image.alt)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ampliar/ })).not.toBeInTheDocument();
  });
});
