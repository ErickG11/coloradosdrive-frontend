import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { StudentDetail, StudentProfile } from "@/app/(admin)/admin/students/StudentDetail";
import { StudentSchedule } from "@/app/(admin)/admin/students/StudentSchedule";
import { StudentGraduation } from "@/app/(admin)/admin/students/StudentGraduation";
import { graduationStudent } from "@/tests/fixtures/studentGraduation";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockResolvedValue(graduationStudent);
});
it("muestra encabezado, pendientes primero y datos concretos del alumno con pagos y horas parciales", () => {
  render(<StudentProfile student={graduationStudent} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Alumno ficticio");
  expect(screen.getByText(graduationStudent.cedula)).toBeInTheDocument();
  expect(screen.getByText(graduationStudent.correo!)).toBeInTheDocument();
  expect(screen.getByText("Faltan 4 requisitos")).toBeInTheDocument();
  const section = screen.getByRole("region", { name: "Requisitos de Curso ficticio" });
  const rows = within(section).getAllByRole("listitem");
  expect(rows.slice(0, 4).every((r) => r.textContent?.startsWith("Pendiente"))).toBe(true);
  expect(rows[4]).toHaveTextContent("Cumplido");
  for (const text of [
    "Saldo pendiente $70.00; abonado $30.00",
    "6 de 10 horas",
    "1 de 2 aprobados",
    "Falta: cédula",
  ])
    expect(within(section).getByText(text, { exact: false })).toBeInTheDocument();
});
it("una sola petición GET entrega encabezado, requisitos y horario", async () => {
  render(<StudentDetail id={graduationStudent.id} />);
  await screen.findByText("Faltan 4 requisitos");
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(api.get).toHaveBeenCalledWith("/admin/estudiantes/" + graduationStudent.id);
  expect(api.post).not.toHaveBeenCalled();
  expect(api.patch).not.toHaveBeenCalled();
});
it("horario solo lectura: hora Ecuador, estados claros e historial cerrado por defecto", () => {
  render(<StudentSchedule schedule={graduationStudent.practiceSchedule} />);
  expect(screen.getByText("Instructor: Instructor ficticio · Reservada")).toBeInTheDocument();
  expect(screen.getByText(/17 de octubre de 2026(?:,| a las) 10:00/)).toBeInTheDocument();
  expect(screen.getByText(/Instructor ficticio · Confirmada/)).toBeInTheDocument();
  expect(screen.getByText(/Instructor ficticio · Liberada/)).toBeInTheDocument();
  expect(screen.getByText(/Instructor ficticio · Pendiente de reprogramar/)).toBeInTheDocument();
  expect(screen.getByText("La franja está ocupada.")).toBeInTheDocument();
  const summary = screen.getByText("Historial reciente (últimas 10 prácticas)");
  expect(summary.closest("details")).not.toHaveAttribute("open");
  fireEvent.click(summary);
  expect(summary.closest("details")).toHaveAttribute("open");
  expect(screen.getAllByText("Asistió")).toHaveLength(6);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
it("sin matrícula o datos completos no declara graduación falsa", () => {
  const view = render(<StudentGraduation graduation={{ pendingCount: null, enrollments: [] }} />);
  expect(screen.getByText(/No hay matrículas vigentes/)).toBeInTheDocument();
  expect(screen.queryByText("Todos los requisitos cumplidos")).not.toBeInTheDocument();
  view.rerender(
    <StudentGraduation
      graduation={{
        pendingCount: 0,
        enrollments: graduationStudent.graduation.enrollments.map((e) => ({
          ...e,
          checks: e.checks.map((c) => ({ ...c, fulfilled: true })),
        })),
      }}
    />,
  );
  expect(screen.getByText("Todos los requisitos cumplidos")).toBeInTheDocument();
});
it("horario vacío y nombres/asistencia no disponibles sin inventarlos", () => {
  const view = render(<StudentSchedule schedule={{ upcoming: [], recent: [], recovery: [] }} />);
  expect(screen.getByText("No hay próximas prácticas reservadas.")).toBeInTheDocument();
  view.rerender(
    <StudentSchedule
      schedule={{
        upcoming: [],
        recovery: [],
        recent: [
          { ...graduationStudent.practiceSchedule.recent[0], instructor: null, attended: null },
        ],
      }}
    />,
  );
  expect(screen.getByText(/Instructor: No disponible/)).toBeInTheDocument();
  expect(screen.getByText("Asistencia sin registrar")).toBeInTheDocument();
});
it("error de la ficha y reintento recargan el mismo endpoint", async () => {
  vi.mocked(api.get).mockRejectedValueOnce(new ApiError("No se pudo consultar estudiantes", 503));
  render(<StudentDetail id={graduationStudent.id} />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await screen.findByText("Faltan 4 requisitos");
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  expect(
    vi
      .mocked(api.get)
      .mock.calls.every(([path]) => path === "/admin/estudiantes/" + graduationStudent.id),
  ).toBe(true);
});
