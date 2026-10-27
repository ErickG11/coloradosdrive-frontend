import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SlotAttendance } from "@/app/(instructor)/instructor/SlotAttendance";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { correctionDeadline } from "@/lib/utils/practiceAttendance";
import type { PracticeSlotWithNames } from "@/types";

vi.mock("@/lib/api/client", () => ({ api: { patch: vi.fn() } }));
const slot: PracticeSlotWithNames = {
  id: "slot",
  cohortId: "cohort",
  instructorId: "instructor",
  studentId: "student",
  scheduledAt: "2026-10-26T15:00:00Z",
  durationMinutes: 60,
  status: "completado",
  attended: true,
  instructorName: "Instructor",
  studentName: "Alumno",
  confirmationNotifiedAt: null,
  releaseNotifiedAt: null,
  confirmedAt: null,
  createdAt: "",
  updatedAt: "",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-26T18:00:00Z"));
});
afterEach(() => vi.useRealTimers());
async function open() {
  const user = userEvent.setup();
  render(<SlotAttendance slot={slot} onSaved={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Cambiar asistencia" }));
  await user.click(screen.getByRole("button", { name: "No asistió" }));
  return user;
}
describe("correcciones del instructor E4", () => {
  it("rechaza motivo vacío y corto, enfoca el campo y envía el texto recortado", async () => {
    vi.mocked(api.patch).mockResolvedValue({ ...slot, attended: false });
    const user = await open();
    const field = screen.getByLabelText("Motivo de la corrección");
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(screen.getByRole("alert")).toHaveTextContent("entre 10 y 500");
    expect(field).toHaveFocus();
    expect(api.patch).not.toHaveBeenCalled();
    await user.type(field, " corto ");
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(api.patch).not.toHaveBeenCalled();
    await user.clear(field);
    await user.type(field, "  Revisé el registro con el alumno  ");
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(api.patch).toHaveBeenCalledExactlyOnceWith("/practice-slots/slot/attendance", {
      attended: false,
      motivo: "Revisé el registro con el alumno",
    });
  });
  it("rechaza más de 500 caracteres y traduce el 400 junto al campo", async () => {
    const user = await open();
    const field = screen.getByLabelText("Motivo de la corrección");
    await user.click(field);
    await user.paste("x".repeat(501));
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(api.patch).not.toHaveBeenCalled();
    await user.clear(field);
    await user.type(field, "Un motivo suficientemente largo");
    vi.mocked(api.patch).mockRejectedValueOnce(
      new ApiError("Invalid value", 400, { field: "motivo" }),
    );
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("entre 10 y 500");
    expect(screen.queryByText("Invalid value")).not.toBeInTheDocument();
    expect(field).toHaveFocus();
  });
  it.each([
    ["ATTENDANCE_WINDOW_CLOSED", "Ya pasaron las 48 horas"],
    ["ATTENDANCE_SAME_VALUE", "debe cambiar el valor actual"],
    ["PRACTICE_NOT_FOUND", "Franja no encontrada"],
  ])("explica el error %s", async (code, message) => {
    vi.mocked(api.patch).mockRejectedValueOnce(
      new ApiError("error", code === "PRACTICE_NOT_FOUND" ? 404 : 409, { code }),
    );
    const user = await open();
    await user.type(
      screen.getByLabelText("Motivo de la corrección"),
      "Revisé el registro original",
    );
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent(message);
    if (code === "ATTENDANCE_WINDOW_CLOSED")
      expect(screen.getByRole("button", { name: "Confirmar cambio" })).toBeDisabled();
  });
  it("admite el límite exacto desde el fin y oculta la corrección al volver fuera de plazo", async () => {
    vi.setSystemTime(correctionDeadline(slot.scheduledAt, 60));
    render(<SlotAttendance slot={slot} onSaved={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Cambiar asistencia" })).toBeInTheDocument();
    act(() => {
      vi.setSystemTime(correctionDeadline(slot.scheduledAt, 60) + 1);
      window.dispatchEvent(new Event("focus"));
    });
    expect(screen.queryByRole("button", { name: "Cambiar asistencia" })).not.toBeInTheDocument();
    expect(screen.getByText(/Ya pasaron las 48 horas/)).toBeInTheDocument();
  });
  it("mantiene el registro inicial fuera de la ventana de corrección", async () => {
    vi.setSystemTime(new Date("2026-11-01T18:00:00Z"));
    vi.mocked(api.patch).mockResolvedValue({ ...slot, attended: true });
    const user = userEvent.setup();
    render(<SlotAttendance slot={{ ...slot, attended: null }} onSaved={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Asistió" }));
    expect(api.patch).toHaveBeenCalledWith("/practice-slots/slot/attendance", { attended: true });
  });
  it("cierra con Escape y devuelve el foco al control que abrió el diálogo", async () => {
    const user = await open();
    const trigger = screen.getByRole("button", { name: "No asistió" });
    expect(screen.getByRole("dialog")).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(api.patch).not.toHaveBeenCalled();
  });
});
