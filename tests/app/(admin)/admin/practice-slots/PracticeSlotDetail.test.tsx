import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PracticeSlotDetail } from "@/app/(admin)/admin/practice-slots/PracticeSlotDetail";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { PracticeSlotWithNames } from "@/types";

vi.mock("@/lib/api/client", () => ({
  api: {
    delete: vi.fn(),
  },
}));

const mockedDelete = vi.mocked(api.delete);

function buildSlot(overrides: Partial<PracticeSlotWithNames> = {}): PracticeSlotWithNames {
  return {
    id: "slot-1",
    cohortId: "cohort-1",
    instructorId: "instructor-1",
    studentId: null,
    scheduledAt: "2026-03-10T15:00:00.000Z",
    durationMinutes: 40,
    status: "disponible",
    confirmationNotifiedAt: null,
    releaseNotifiedAt: null,
    confirmedAt: null,
    attended: null,
    createdAt: "",
    updatedAt: "",
    instructorName: "Bruno Salas",
    studentName: null,
    ...overrides,
  };
}

describe("PracticeSlotDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra instructor, estudiante y estado", () => {
    render(
      <PracticeSlotDetail
        slot={buildSlot({ status: "asignado", studentName: "Ana Torres" })}
        onEdit={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );

    expect(screen.getByText("Bruno Salas")).toBeInTheDocument();
    expect(screen.getByText("Ana Torres")).toBeInTheDocument();
    expect(screen.getByText("Asignado")).toBeInTheDocument();
  });

  it("habilita Editar/Eliminar y no muestra la nota cuando la franja está disponible", () => {
    render(
      <PracticeSlotDetail slot={buildSlot({ status: "disponible" })} onEdit={vi.fn()} onDeleted={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Editar franja" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Eliminar franja" })).toBeEnabled();
    expect(screen.queryByText(/Solo se puede editar o eliminar/)).not.toBeInTheDocument();
  });

  it("deshabilita Editar/Eliminar y explica por qué cuando la franja no está disponible", () => {
    render(
      <PracticeSlotDetail
        slot={buildSlot({ status: "confirmado", studentId: "student-1", studentName: "Ana Torres" })}
        onEdit={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Editar franja" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Eliminar franja" })).toBeDisabled();
    expect(screen.getByText(/Solo se puede editar o eliminar/)).toBeInTheDocument();
  });

  it("llama a onEdit al hacer clic en Editar", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<PracticeSlotDetail slot={buildSlot()} onEdit={onEdit} onDeleted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Editar franja" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("elimina la franja y llama a onDeleted", async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    mockedDelete.mockResolvedValue(undefined);
    render(<PracticeSlotDetail slot={buildSlot()} onEdit={vi.fn()} onDeleted={onDeleted} />);

    await user.click(screen.getByRole("button", { name: "Eliminar franja" }));

    expect(mockedDelete).toHaveBeenCalledWith("/practice-slots/slot-1");
    // El padre (ver page.tsx) es quien cierra el Modal al recibir
    // onDeleted; este componente no necesita "revertir" su estado de
    // carga porque para entonces ya se desmontó.
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });

  it("muestra el error del backend si la eliminación falla (ej. condición de carrera)", async () => {
    const user = userEvent.setup();
    mockedDelete.mockRejectedValue(new ApiError("Esta franja ya no está disponible", 409));
    render(<PracticeSlotDetail slot={buildSlot()} onEdit={vi.fn()} onDeleted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Eliminar franja" }));

    expect(await screen.findByText("Esta franja ya no está disponible")).toBeInTheDocument();
  });
});
