import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PracticeSlotsPage from "@/app/(admin)/admin/practice-slots/page";
import { useFetch } from "@/hooks/useFetch";
import type { Cohort, PracticeSlot, UserSummary } from "@/types";

vi.mock("@/hooks/useFetch", () => ({
  useFetch: vi.fn(),
}));

const mockedUseFetch = vi.mocked(useFetch);

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
const students: UserSummary[] = [{ id: "student-1", nombreCompleto: "Ana Torres" }];

// La página arranca en la semana de "hoy" (sin prop para inyectar otra
// fecha) - se fecha la franja de prueba en el propio día real, en vez de
// fijar el reloj del sistema (evita interferir con los timers de
// framer-motion que usa el Modal).
const today = new Date();
const slotScheduledAt = new Date(
  today.getFullYear(),
  today.getMonth(),
  today.getDate(),
  14,
  0,
  0,
).toISOString();

const slot: PracticeSlot = {
  id: "slot-1",
  cohortId: "cohort-1",
  instructorId: "instructor-1",
  studentId: "student-1",
  scheduledAt: slotScheduledAt,
  durationMinutes: 40,
  status: "asignado",
  confirmationNotifiedAt: null,
  releaseNotifiedAt: null,
  confirmedAt: null,
  attended: null,
  createdAt: "",
  updatedAt: "",
};

function mockFetch(
  slotsResult: { data: PracticeSlot[] | null; isLoading: boolean; error: string | null } = {
    data: [slot],
    isLoading: false,
    error: null,
  },
) {
  mockedUseFetch.mockImplementation((path: unknown) => {
    if (path === "/cohorts") {
      return { data: cohorts, isLoading: false, error: null, refetch: vi.fn() };
    }
    if (path === "/users?rol=instructor") {
      return { data: instructors, isLoading: false, error: null, refetch: vi.fn() };
    }
    if (path === "/users?rol=estudiante") {
      return { data: students, isLoading: false, error: null, refetch: vi.fn() };
    }
    if (typeof path === "string" && path.startsWith("/practice-slots")) {
      return { ...slotsResult, refetch: vi.fn() };
    }
    throw new Error(`useFetch mockeado con un path inesperado: ${String(path)}`);
  });
}

describe("PracticeSlotsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el estado de carga de las franjas", () => {
    mockFetch({ data: null, isLoading: true, error: null });

    render(<PracticeSlotsPage />);

    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("muestra el error si falla la carga de franjas", () => {
    mockFetch({ data: null, isLoading: false, error: "No se pudo conectar con el servidor." });

    render(<PracticeSlotsPage />);

    expect(screen.getByText("No se pudo conectar con el servidor.")).toBeInTheDocument();
  });

  it("al cambiar el filtro de cohorte, pide las franjas filtradas por esa cohorte", () => {
    mockFetch();
    render(<PracticeSlotsPage />);

    fireEvent.change(screen.getByLabelText("Cohorte"), { target: { value: "cohort-1" } });

    expect(mockedUseFetch).toHaveBeenCalledWith("/practice-slots?cohortId=cohort-1");
  });

  it("al cambiar el filtro de instructor, pide las franjas filtradas por ese instructor", () => {
    mockFetch();
    render(<PracticeSlotsPage />);

    fireEvent.change(screen.getByLabelText("Instructor"), { target: { value: "instructor-1" } });

    expect(mockedUseFetch).toHaveBeenCalledWith("/practice-slots?instructorId=instructor-1");
  });

  it("abre el detalle de la franja al hacer clic en ella, con instructor y estudiante resueltos", async () => {
    const user = userEvent.setup();
    mockFetch();
    render(<PracticeSlotsPage />);

    // El nombre del instructor también aparece como <option> del filtro y
    // en ambos layouts (grilla desktop + agenda mobile, ambos presentes a
    // la vez en jsdom): el chip de la franja es cualquiera de los botones.
    const [chip] = screen.getAllByRole("button", { name: /Bruno Salas/ });
    await user.click(chip);

    expect(screen.getByRole("dialog", { name: "Detalle de la franja" })).toBeInTheDocument();
    expect(screen.getAllByText("Ana Torres").length).toBeGreaterThan(0);
  });

  it("abre el formulario de creación al hacer clic en 'Nueva franja'", async () => {
    const user = userEvent.setup();
    mockFetch();
    render(<PracticeSlotsPage />);

    await user.click(screen.getByRole("button", { name: "Nueva franja" }));

    expect(screen.getByRole("dialog", { name: "Nueva franja" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear franja" })).toBeInTheDocument();
  });

  it("en el detalle, 'Editar' aparece deshabilitado si la franja no está disponible", async () => {
    const user = userEvent.setup();
    mockFetch(); // la franja de prueba está 'asignada'
    render(<PracticeSlotsPage />);

    const [chip] = screen.getAllByRole("button", { name: /Bruno Salas/ });
    await user.click(chip);

    expect(screen.getByRole("button", { name: "Editar" })).toBeDisabled();
  });

  it("desde el detalle de una franja disponible, 'Editar' abre el formulario prefilled", async () => {
    const user = userEvent.setup();
    mockFetch({
      data: [{ ...slot, status: "disponible", studentId: null }],
      isLoading: false,
      error: null,
    });
    render(<PracticeSlotsPage />);

    const [chip] = screen.getAllByRole("button", { name: /Bruno Salas/ });
    await user.click(chip);
    await user.click(screen.getByRole("button", { name: "Editar" }));

    const dialog = screen.getByRole("dialog", { name: "Editar franja" });
    expect(within(dialog).getByLabelText("Cohorte")).toBeDisabled();
    expect(within(dialog).getByLabelText("Instructor")).toHaveValue("instructor-1");
  });
});
