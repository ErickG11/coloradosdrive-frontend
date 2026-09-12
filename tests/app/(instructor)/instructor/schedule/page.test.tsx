import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InstructorSchedulePage from "@/app/(instructor)/instructor/schedule/page";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { PracticeSlotWithNames } from "@/types";

vi.mock("@/hooks/useFetch", () => ({
  useFetch: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    patch: vi.fn(),
  },
}));

const mockedUseFetch = vi.mocked(useFetch);
const mockedPatch = vi.mocked(api.patch);
const refetchSlots = vi.fn();

function buildSlot(overrides: Partial<PracticeSlotWithNames> = {}): PracticeSlotWithNames {
  return {
    id: "slot-1",
    cohortId: "cohort-1",
    instructorId: "instructor-1",
    studentId: "student-1",
    scheduledAt: "2026-03-10T15:00:00.000Z",
    durationMinutes: 40,
    status: "completado",
    confirmationNotifiedAt: null,
    releaseNotifiedAt: null,
    confirmedAt: null,
    attended: null,
    createdAt: "",
    updatedAt: "",
    instructorName: "Bruno Salas",
    studentName: "Ana Torres",
    ...overrides,
  };
}

function mockFetch(
  result: { data: PracticeSlotWithNames[] | null; isLoading: boolean; error: string | null } = {
    data: [],
    isLoading: false,
    error: null,
  },
) {
  mockedUseFetch.mockImplementation((path: unknown) => {
    if (path === "/practice-slots") {
      return { ...result, refetch: refetchSlots };
    }
    throw new Error(`useFetch mockeado con un path inesperado: ${String(path)}`);
  });
}

describe("InstructorSchedulePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el estado de carga", () => {
    mockFetch({ data: null, isLoading: true, error: null });

    render(<InstructorSchedulePage />);

    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("muestra el error si falla la carga", () => {
    mockFetch({ data: null, isLoading: false, error: "No se pudo conectar con el servidor." });

    render(<InstructorSchedulePage />);

    expect(screen.getByText("No se pudo conectar con el servidor.")).toBeInTheDocument();
  });

  it("muestra un mensaje cuando no tiene franjas", () => {
    mockFetch({ data: [], isLoading: false, error: null });

    render(<InstructorSchedulePage />);

    expect(screen.getByText("Todavía no tienes franjas asignadas.")).toBeInTheDocument();
  });

  it("lista sus franjas con el nombre del estudiante y el estado, sin llamar a /users", () => {
    mockFetch({
      data: [
        buildSlot({ status: "asignado" }),
        buildSlot({ id: "slot-2", studentId: null, studentName: null, status: "disponible" }),
      ],
      isLoading: false,
      error: null,
    });

    render(<InstructorSchedulePage />);

    expect(screen.getByText(/Ana Torres/)).toBeInTheDocument();
    expect(screen.getByText(/Sin estudiante asignado/)).toBeInTheDocument();
    expect(mockedUseFetch).not.toHaveBeenCalledWith(expect.stringContaining("/users"));
  });

  it("una franja 'completado' sin asistencia registrada muestra las 2 acciones", () => {
    mockFetch({
      data: [buildSlot({ status: "completado", attended: null })],
      isLoading: false,
      error: null,
    });

    render(<InstructorSchedulePage />);

    expect(screen.getByText("Asistencia sin registrar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Asistió" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No asistió" })).toBeInTheDocument();
  });

  it("una franja que no está 'completado' no muestra acciones de asistencia", () => {
    mockFetch({ data: [buildSlot({ status: "asignado" })], isLoading: false, error: null });

    render(<InstructorSchedulePage />);

    expect(screen.queryByRole("button", { name: "Asistió" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "No asistió" })).not.toBeInTheDocument();
  });

  it("marca asistencia: llama a PATCH .../attendance con attended=true y refresca", async () => {
    const user = userEvent.setup();
    mockedPatch.mockResolvedValue(buildSlot({ status: "completado", attended: true }));
    mockFetch({
      data: [buildSlot({ status: "completado", attended: null })],
      isLoading: false,
      error: null,
    });

    render(<InstructorSchedulePage />);
    await user.click(screen.getByRole("button", { name: "Asistió" }));

    expect(mockedPatch).toHaveBeenCalledWith("/practice-slots/slot-1/attendance", {
      attended: true,
    });
    expect(refetchSlots).toHaveBeenCalled();
  });

  it("marca asistencia: llama a PATCH .../attendance con attended=false", async () => {
    const user = userEvent.setup();
    mockedPatch.mockResolvedValue(buildSlot({ status: "completado", attended: false }));
    mockFetch({
      data: [buildSlot({ status: "completado", attended: null })],
      isLoading: false,
      error: null,
    });

    render(<InstructorSchedulePage />);
    await user.click(screen.getByRole("button", { name: "No asistió" }));

    expect(mockedPatch).toHaveBeenCalledWith("/practice-slots/slot-1/attendance", {
      attended: false,
    });
  });

  it("muestra el error del backend si falla el registro de asistencia", async () => {
    const user = userEvent.setup();
    mockedPatch.mockRejectedValue(
      new ApiError("Solo se puede marcar asistencia sobre una franja completada", 409),
    );
    mockFetch({
      data: [buildSlot({ status: "completado", attended: null })],
      isLoading: false,
      error: null,
    });

    render(<InstructorSchedulePage />);
    await user.click(screen.getByRole("button", { name: "Asistió" }));

    expect(
      await screen.findByText("Solo se puede marcar asistencia sobre una franja completada"),
    ).toBeInTheDocument();
  });
});
