import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PracticeSlotForm } from "@/app/(admin)/admin/practice-slots/PracticeSlotForm";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Cohort, PracticeSlot, UserSummary } from "@/types";

vi.mock("@/lib/api/client", () => ({
  api: {
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockedPost = vi.mocked(api.post);
const mockedPatch = vi.mocked(api.patch);

const cohorts: Cohort[] = [
  {
    id: "cohort-1",
    courseId: "course-a",
    nombre: "Cohorte Marzo",
    precio: 150,
    cupoMaximo: 20,
    fechaInicio: "2026-03-01",
    fechaFin: "2026-06-01",
    createdAt: "",
    updatedAt: "",
  },
];

const instructors: UserSummary[] = [{ id: "instructor-1", nombreCompleto: "Bruno Salas" }];

const existingSlot: PracticeSlot = {
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
};

describe("PracticeSlotForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("modo creación: envía POST /practice-slots con los 4 campos", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    mockedPost.mockResolvedValue(existingSlot);
    render(
      <PracticeSlotForm
        cohorts={cohorts}
        instructors={instructors}
        onSaved={onSaved}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Cohorte"), { target: { value: "cohort-1" } });
    fireEvent.change(screen.getByLabelText("Instructor"), { target: { value: "instructor-1" } });
    fireEvent.change(screen.getByLabelText("Fecha y hora"), {
      target: { value: "2026-03-10T10:00" },
    });
    fireEvent.change(screen.getByLabelText("Duración (minutos)"), { target: { value: "40" } });

    await user.click(screen.getByRole("button", { name: "Crear franja" }));

    expect(mockedPost).toHaveBeenCalledWith("/practice-slots", {
      cohortId: "cohort-1",
      instructorId: "instructor-1",
      scheduledAt: new Date("2026-03-10T10:00").toISOString(),
      durationMinutes: 40,
    });
    expect(onSaved).toHaveBeenCalledWith(existingSlot);
  });

  it("modo edición: la cohorte está deshabilitada y el PATCH no la incluye", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    mockedPatch.mockResolvedValue({ ...existingSlot, durationMinutes: 60 });
    render(
      <PracticeSlotForm
        cohorts={cohorts}
        instructors={instructors}
        slot={existingSlot}
        onSaved={onSaved}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Cohorte")).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Duración (minutos)"), { target: { value: "60" } });
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(mockedPatch).toHaveBeenCalledWith("/practice-slots/slot-1", {
      instructorId: "instructor-1",
      scheduledAt: existingSlot.scheduledAt,
      durationMinutes: 60,
    });
  });

  it("muestra el mensaje de error del backend (ej. condición de carrera al editar)", async () => {
    const user = userEvent.setup();
    mockedPatch.mockRejectedValue(new ApiError("Esta franja ya no está disponible", 409));
    render(
      <PracticeSlotForm
        cohorts={cohorts}
        instructors={instructors}
        slot={existingSlot}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Esta franja ya no está disponible")).toBeInTheDocument();
  });

  it("llama a onCancel al hacer clic en Cancelar", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <PracticeSlotForm
        cohorts={cohorts}
        instructors={instructors}
        onSaved={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
