import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StudentSchedulePage from "@/app/(student)/student/schedule/page";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useFetch } from "@/hooks/useFetch";
import type { PracticeSlot, UserSummary } from "@/types";

vi.mock("@/hooks/useFetch", () => ({
  useFetch: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    post: vi.fn(),
  },
}));

const mockedUseFetch = vi.mocked(useFetch);
const mockedPost = vi.mocked(api.post);

const instructors: UserSummary[] = [{ id: "instructor-1", nombreCompleto: "Bruno Salas" }];

function buildSlot(overrides: Partial<PracticeSlot> = {}): PracticeSlot {
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
    ...overrides,
  };
}

const refetchSlots = vi.fn();

function mockFetch(slots: PracticeSlot[]) {
  mockedUseFetch.mockImplementation((path: unknown) => {
    if (path === "/practice-slots") {
      return { data: slots, isLoading: false, error: null, refetch: refetchSlots };
    }
    if (path === "/users?rol=instructor") {
      return { data: instructors, isLoading: false, error: null, refetch: vi.fn() };
    }
    throw new Error(`useFetch mockeado con un path inesperado: ${String(path)}`);
  });
}

describe("StudentSchedulePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra un mensaje cuando no tiene franja propia ni hay disponibles", () => {
    mockFetch([]);

    render(<StudentSchedulePage />);

    expect(screen.getByText("No tienes ninguna franja reclamada todavía.")).toBeInTheDocument();
    expect(screen.getByText("No hay franjas disponibles en tu cohorte por ahora.")).toBeInTheDocument();
  });

  it("lista las franjas disponibles con el nombre del instructor", () => {
    mockFetch([buildSlot({ status: "disponible" })]);

    render(<StudentSchedulePage />);

    expect(screen.getByText(/Bruno Salas/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reclamar" })).toBeInTheDocument();
  });

  it("una franja 'liberado' (sin dueño) aparece como disponible para reclamar", () => {
    mockFetch([buildSlot({ status: "liberado", studentId: null })]);

    render(<StudentSchedulePage />);

    expect(screen.getByRole("button", { name: "Reclamar" })).toBeInTheDocument();
  });

  it("reclama una franja: llama a POST .../claim y refresca la lista", async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue(buildSlot({ status: "asignado", studentId: "student-1" }));
    mockFetch([buildSlot({ status: "disponible" })]);

    render(<StudentSchedulePage />);
    await user.click(screen.getByRole("button", { name: "Reclamar" }));

    expect(mockedPost).toHaveBeenCalledWith("/practice-slots/slot-1/claim");
    expect(refetchSlots).toHaveBeenCalled();
  });

  it("muestra el error legible del backend si otro estudiante ya reclamó la franja (409)", async () => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValue(new ApiError("Esta franja ya no está disponible", 409));
    mockFetch([buildSlot({ status: "disponible" })]);

    render(<StudentSchedulePage />);
    await user.click(screen.getByRole("button", { name: "Reclamar" }));

    expect(await screen.findByText("Esta franja ya no está disponible")).toBeInTheDocument();
    // Se refresca igual: la lista quedó desactualizada tras la carrera.
    expect(refetchSlots).toHaveBeenCalled();
  });

  it("una franja propia 'asignado' muestra Confirmar y Cancelar", () => {
    mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);

    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("confirma la franja propia: llama a POST .../confirm", async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue(buildSlot({ status: "confirmado", studentId: "student-1" }));
    mockFetch([buildSlot({ status: "asignado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(mockedPost).toHaveBeenCalledWith("/practice-slots/slot-1/confirm");
  });

  it("una franja propia 'confirmado' solo muestra Cancelar (no Confirmar)", () => {
    mockFetch([buildSlot({ status: "confirmado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);

    expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("cancela la franja propia incluso ya confirmada: llama a POST .../cancel", async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue(buildSlot({ status: "liberado", studentId: null }));
    mockFetch([buildSlot({ status: "confirmado", studentId: "student-1" })]);

    render(<StudentSchedulePage />);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(mockedPost).toHaveBeenCalledWith("/practice-slots/slot-1/cancel");
  });

  it("no muestra como propias las franjas completado/sin_practica (historial fuera de alcance)", () => {
    mockFetch([
      buildSlot({ id: "slot-old", status: "completado", studentId: "student-1" }),
      buildSlot({ id: "slot-missed", status: "sin_practica", studentId: null }),
    ]);

    render(<StudentSchedulePage />);

    expect(screen.getByText("No tienes ninguna franja reclamada todavía.")).toBeInTheDocument();
  });
});
