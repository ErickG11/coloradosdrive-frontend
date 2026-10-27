import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CancelPracticeModal } from "@/app/(student)/student/schedule/CancelPracticeModal";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { CancellationPreview } from "@/types/practiceSlot";

vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn() } }));

const mockedPost = vi.mocked(api.post);
const preview: CancellationPreview = {
  reprogramacionesRestantes: 2,
  hayFranjasLibres: true,
  resultadoSiCancela: "reprogramable",
};

function open(previewValue = preview) {
  const onClose = vi.fn();
  const onCancelled = vi.fn();
  render(<CancelPracticeModal slotId="slot-1" preview={previewValue} onClose={onClose} onCancelled={onCancelled} />);
  return { onClose, onCancelled };
}

describe("CancelPracticeModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra las seis categorías exactas, enfoca el selector y exige 10 caracteres tras recortar", async () => {
    const user = userEvent.setup();
    open();
    const category = screen.getByLabelText("Motivo de inasistencia");
    const confirm = screen.getByRole("button", { name: "Confirmar que no asistiré" });
    expect(category).toHaveFocus();
    expect(screen.getAllByRole("option").map((option) => option.getAttribute("value"))).toEqual([
      "", "salud", "trabajo", "estudios", "familiar", "transporte", "otro",
    ]);
    expect(screen.getByText("Podrás elegir otra hora disponible.")).toBeInTheDocument();
    expect(screen.getByText("Al confirmar, la hora quedará liberada para otros alumnos de tu cohorte.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver" })).toBeInTheDocument();
    expect(confirm).toBeDisabled();
    await user.selectOptions(category, "trabajo");
    await user.type(screen.getByLabelText("Explica el motivo de inasistencia"), "  corto  ");
    expect(screen.getByText("5 caracteres · mínimo 10")).toBeInTheDocument();
    expect(confirm).toBeDisabled();
    await user.clear(screen.getByLabelText("Explica el motivo de inasistencia"));
    await user.type(screen.getByLabelText("Explica el motivo de inasistencia"), "  Tengo que trabajar  ");
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(mockedPost).toHaveBeenCalledWith("/practice-slots/slot-1/cancel", {
      motivoCategoria: "trabajo", motivoTexto: "Tengo que trabajar",
    });
  });

  it("muestra los tres mensajes de consecuencia según la vista previa", () => {
    const { unmount } = render(<CancelPracticeModal slotId="s1" preview={{ ...preview, resultadoSiCancela: "hora_perdida" }} onClose={vi.fn()} onCancelled={vi.fn()} />);
    expect(screen.getByText(/No hay horarios libres antes del cierre/)).toBeInTheDocument();
    unmount();
    open({ ...preview, reprogramacionesRestantes: 0, resultadoSiCancela: "falta" });
    expect(screen.getByText(/quedará registrada como falta/)).toBeInTheDocument();
  });

  it.each([400, 409])("deja el formulario usable tras un %i y cierra con Escape", async (status) => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValue(new ApiError("Revisa el motivo o la matrícula", status));
    const { onClose } = open();
    await user.selectOptions(screen.getByLabelText("Motivo de inasistencia"), "salud");
    await user.type(screen.getByLabelText("Explica el motivo de inasistencia"), "Cita médica confirmada");
    await user.click(screen.getByRole("button", { name: "Confirmar que no asistiré" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(status === 400
      ? "Revisa el motivo e inténtalo de nuevo."
      : "Revisa el motivo o la matrícula");
    expect(screen.getByRole("button", { name: "Confirmar que no asistiré" })).toBeEnabled();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each([
    ["motivoCategoria", "Selecciona una categoría de inasistencia válida."],
    ["motivoTexto", "Escribe un motivo de al menos 10 caracteres."],
  ])("muestra un error localizado para el campo %s, sin enseñar 'Invalid value'", async (field, message) => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValue(new ApiError("Invalid value", 400, { field }));
    open();
    await user.selectOptions(screen.getByLabelText("Motivo de inasistencia"), "salud");
    await user.type(screen.getByLabelText("Explica el motivo de inasistencia"), "Cita médica confirmada");
    await user.click(screen.getByRole("button", { name: "Confirmar que no asistiré" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByText("Invalid value")).not.toBeInTheDocument();
  });
});
