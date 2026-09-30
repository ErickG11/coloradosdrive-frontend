import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InstructorSchedulePage from "@/app/(instructor)/instructor/schedule/page";
import { useFetch } from "@/hooks/useFetch";
import type { InstructorOwn } from "@/types";

vi.mock("@/hooks/useFetch", () => ({ useFetch: vi.fn() }));

const mockedUseFetch = vi.mocked(useFetch);
const own: InstructorOwn = {
  profile: {
    id: "instructor-1", cedula: "1710034065", nombreCompleto: "Bruno Salas",
    telefono: "0991234567", correo: "bruno@example.com", activo: true, createdAt: "",
  },
  practiceSlots: [{
    id: "slot-1", cohortId: "cohort-1", scheduledAt: "2026-03-10T15:00:00.000Z",
    durationMinutes: 60, status: "completado", studentName: "Ana Torres",
  }],
};

function mockFetch(result: { data: InstructorOwn | null; isLoading: boolean; error: string | null }) {
  mockedUseFetch.mockImplementation((path: unknown) => {
    if (path !== "/instructores/me") throw new Error(`Ruta inesperada: ${String(path)}`);
    return { ...result, refetch: vi.fn() };
  });
}

describe("InstructorSchedulePage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra carga y error", () => {
    mockFetch({ data: null, isLoading: true, error: null });
    const view = render(<InstructorSchedulePage />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
    mockFetch({ data: null, isLoading: false, error: "No se pudo consultar el horario" });
    view.rerender(<InstructorSchedulePage />);
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo consultar el horario");
  });

  it("muestra perfil y vacío cuando no hay franjas", () => {
    mockFetch({ data: { ...own, practiceSlots: [] }, isLoading: false, error: null });
    render(<InstructorSchedulePage />);
    expect(screen.getByText("Bruno Salas")).toBeInTheDocument();
    expect(screen.getByText("Todavía no tienes franjas asignadas.")).toBeInTheDocument();
  });

  it("muestra solo su horario de /instructores/me sin acciones de asistencia", () => {
    mockFetch({ data: own, isLoading: false, error: null });
    render(<InstructorSchedulePage />);
    expect(screen.getByText(/Ana Torres/)).toBeInTheDocument();
    expect(screen.getByText("Bruno Salas")).toBeInTheDocument();
    expect(mockedUseFetch).toHaveBeenCalledWith("/instructores/me");
    expect(screen.queryByRole("button", { name: /Asistió|No asistió/ })).not.toBeInTheDocument();
  });
});
