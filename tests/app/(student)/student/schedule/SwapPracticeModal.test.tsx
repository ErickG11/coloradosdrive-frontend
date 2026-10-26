import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SwapPracticeModal } from "@/app/(student)/student/schedule/SwapPracticeModal";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { PendingPracticeSlot, ReleasedPracticeSlot } from "@/types/practiceSlot";

vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn() } }));
const mockedPost = vi.mocked(api.post);

const slot: ReleasedPracticeSlot = {
  id: "slot-2", cohortId: "cohort-1", enrollmentId: "enrollment-1",
  scheduledAt: "2099-01-10T15:00:00.000Z", durationMinutes: 60,
  status: "liberado", caso: "A", via: "reposicion", practicasASoltarIds: [],
  reprogramacionesRestantes: 1,
};

const pending: PendingPracticeSlot = {
  enrollmentId: "enrollment-1",
  slot: {
    id: "source-1", cohortId: "cohort-1", instructorId: "instructor-1", studentId: "student-1",
    scheduledAt: "2099-01-09T15:00:00.000Z", durationMinutes: 60, status: "asignado",
    confirmationNotifiedAt: null, releaseNotifiedAt: null, confirmedAt: null, attended: null,
    createdAt: "", updatedAt: "",
  },
};

function open(value = slot, options: PendingPracticeSlot[] = []) {
  const onClose = vi.fn();
  const onSwapped = vi.fn();
  const onConflict = vi.fn();
  render(<SwapPracticeModal slot={value} pending={options} onClose={onClose} onSwapped={onSwapped} onConflict={onConflict} />);
  return { onClose, onSwapped, onConflict };
}

describe("SwapPracticeModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("caso A enfoca la confirmación, repone sin origen y permite cerrar con Escape", async () => {
    const user = userEvent.setup();
    const { onClose } = open();
    expect(screen.getByText(/Vas a reponer tu hora pendiente/)).toBeInTheDocument();
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar cambio" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
    mockedPost.mockResolvedValue({});
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(mockedPost).toHaveBeenCalledWith("/practice-slots/slot-2/swap", undefined);
  });

  it("caso B obliga a elegir una práctica propia y muestra el costo exacto", async () => {
    const user = userEvent.setup();
    const { onSwapped } = open({ ...slot, caso: "B", via: "cambio", practicasASoltarIds: ["source-1"] }, [pending]);
    expect(screen.getByLabelText("Práctica que soltarás")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Confirmar cambio" })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Práctica que soltarás"), "source-1");
    expect(screen.getByText(/Te quedarían 0 de 2/)).toBeInTheDocument();
    mockedPost.mockResolvedValue({ caso: "B" });
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(mockedPost).toHaveBeenCalledWith("/practice-slots/slot-2/swap", { practicaASoltarId: "source-1" });
    expect(onSwapped).toHaveBeenCalled();
  });

  it("con cero reprogramaciones bloquea el cambio", async () => {
    const user = userEvent.setup();
    open({ ...slot, caso: "B", via: "cambio", practicasASoltarIds: ["source-1"], reprogramacionesRestantes: 0 }, [pending]);
    await user.selectOptions(screen.getByLabelText("Práctica que soltarás"), "source-1");
    expect(screen.getByRole("button", { name: "Confirmar cambio" })).toBeDisabled();
    expect(screen.getByText(/Ya usaste tus 2 reprogramaciones/)).toBeInTheDocument();
  });

  it.each([
    [new ApiError("Invalid value", 400), /Revisa la práctica elegida/],
    [new ApiError("Otro alumno tomó este cupo o ya no está disponible", 409), /Otro alumno tomó este horario/],
    [new ApiError("La práctica a soltar no es una práctica futura propia de esta matrícula", 409), /ya no es válida/],
    [new ApiError("Ya usaste tus 2 reprogramaciones", 409), /Ya usaste tus 2 reprogramaciones/],
    [new ApiError("Este cupo no es elegible", 409), /ya no está disponible para ti/],
  ])("muestra un error claro y termina el envío: %s", async (failure, message) => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValue(failure);
    const { onConflict } = open();
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("button", { name: "Confirmar cambio" })).toBeEnabled();
    if (failure.status === 409) expect(onConflict).toHaveBeenCalled();
  });
});
