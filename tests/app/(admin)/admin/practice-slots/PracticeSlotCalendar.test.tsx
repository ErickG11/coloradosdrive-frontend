import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PracticeSlotCalendar } from "@/app/(admin)/admin/practice-slots/PracticeSlotCalendar";
import { getMonthGrid, isInMonth } from "@/lib/utils/calendar";
import type { PracticeSlotWithNames } from "@/types";

function buildSlot(overrides: Partial<PracticeSlotWithNames> = {}): PracticeSlotWithNames {
  return {
    id: "slot-1",
    cohortId: "cohort-1",
    instructorId: "instructor-1",
    studentId: null,
    scheduledAt: "2026-01-12T14:00:00.000Z",
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

describe("PracticeSlotCalendar", () => {
  it("muestra el instructor y el estado de cada franja", () => {
    render(
      <PracticeSlotCalendar
        slots={[buildSlot()]}
        viewMode="semana"
        currentDate={new Date(2026, 0, 12)}
        onSelectSlot={vi.fn()}
        onSelectEmptyDay={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/Bruno Salas/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Disponible").length).toBeGreaterThan(0);
  });

  it("muestra el nombre del estudiante cuando la franja está asignada", () => {
    render(
      <PracticeSlotCalendar
        slots={[buildSlot({ studentId: "student-1", status: "asignado", studentName: "Ana Torres" })]}
        viewMode="semana"
        currentDate={new Date(2026, 0, 12)}
        onSelectSlot={vi.fn()}
        onSelectEmptyDay={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Ana Torres").length).toBeGreaterThan(0);
  });

  it("llama a onSelectSlot con la franja al hacer clic en ella", async () => {
    const user = userEvent.setup();
    const onSelectSlot = vi.fn();
    const slot = buildSlot();
    render(
      <PracticeSlotCalendar
        slots={[slot]}
        viewMode="semana"
        currentDate={new Date(2026, 0, 12)}
        onSelectSlot={onSelectSlot}
        onSelectEmptyDay={vi.fn()}
      />,
    );

    const [chip] = screen.getAllByText(/Bruno Salas/);
    await user.click(chip);

    expect(onSelectSlot).toHaveBeenCalledWith(slot);
  });

  it("llama a onSelectEmptyDay al hacer clic en '+ Nueva' de un día en la agenda mobile", async () => {
    const user = userEvent.setup();
    const onSelectEmptyDay = vi.fn();
    render(
      <PracticeSlotCalendar
        slots={[]}
        viewMode="semana"
        currentDate={new Date(2026, 0, 12)}
        onSelectSlot={vi.fn()}
        onSelectEmptyDay={onSelectEmptyDay}
      />,
    );

    const [addButton] = screen.getAllByText("+ Nueva");
    await user.click(addButton);

    expect(onSelectEmptyDay).toHaveBeenCalledTimes(1);
  });

  it("en vista de mes, atenúa (opacity-50) los días fuera del mes actual", () => {
    const month = new Date(2026, 1, 1); // febrero 2026 (28 días)
    const totalGridDays = getMonthGrid(month).flat().length;
    const daysInMonth = getMonthGrid(month).flat().filter((day) => isInMonth(day, month)).length;

    const { container } = render(
      <PracticeSlotCalendar
        slots={[]}
        viewMode="mes"
        currentDate={month}
        onSelectSlot={vi.fn()}
        onSelectEmptyDay={vi.fn()}
      />,
    );

    expect(container.querySelectorAll(".opacity-50")).toHaveLength(totalGridDays - daysInMonth);
    // La agenda mobile solo lista los días del propio mes.
    expect(screen.getAllByText("Sin franjas.")).toHaveLength(daysInMonth);
  });

  it("en vista de mes, colapsa a partir de la cuarta franja con un botón '+N más' expandible", async () => {
    const user = userEvent.setup();
    const slots = Array.from({ length: 5 }, (_, index) =>
      buildSlot({ id: `slot-${index}`, scheduledAt: `2026-01-12T1${index}:00:00.000Z` }),
    );

    render(
      <PracticeSlotCalendar
        slots={slots}
        viewMode="mes"
        currentDate={new Date(2026, 0, 12)}
        onSelectSlot={vi.fn()}
        onSelectEmptyDay={vi.fn()}
      />,
    );

    expect(screen.getByText("+2 más")).toBeInTheDocument();

    await user.click(screen.getByText("+2 más"));

    expect(screen.queryByText("+2 más")).not.toBeInTheDocument();
  });
});
