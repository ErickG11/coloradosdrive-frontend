import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import EditCohortPage from "@/app/(admin)/admin/cohorts/[id]/edit/page";
import NewCohortPage from "@/app/(admin)/admin/cohorts/new/page";
import EnrollmentsPage from "@/app/(admin)/admin/enrollments/page";
import EditExamPage from "@/app/(admin)/admin/exams/[id]/edit/page";
import NewExamPage from "@/app/(admin)/admin/exams/new/page";
import StudentPage from "@/app/(student)/student/page";
import { AdminDashboard } from "@/components/admin-dashboard/AdminDashboard";
import { useFetch } from "@/hooks/useFetch";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "x" }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/hooks/useFetch", () => ({ useFetch: vi.fn() }));
vi.mock("@/app/(admin)/admin/enrollments/wizard/EnrollmentWizard", () => ({
  EnrollmentWizard: () => <p>Asistente</p>,
}));

// Cada pantalla de una sola tarjeta debe tener exactamente un h1: el título
// de la tarjeta (el resto de encabezados son h2 o inferiores).
describe("encabezado principal de cada pantalla", () => {
  beforeEach(() => {
    vi.mocked(useFetch).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
  });

  const screens: Array<[string, () => ReactNode, string]> = [
    ["inicio de estudiante", () => <StudentPage />, "Panel de estudiante"],
    ["matrícula", () => <EnrollmentsPage />, "Matricular estudiante"],
    ["nueva cohorte", () => <NewCohortPage />, "Nueva cohorte"],
    ["editar cohorte", () => <EditCohortPage />, "Editar cohorte"],
    ["nuevo examen", () => <NewExamPage />, "Nuevo examen"],
    ["editar examen", () => <EditExamPage />, "Editar examen"],
  ];

  it.each(screens)("%s tiene un único h1", (_name, renderScreen, title) => {
    render(renderScreen());

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(title);
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  // El panel de administración tiene varias secciones (h2), pero un solo h1.
  it("el panel de administración tiene un único h1", () => {
    render(<AdminDashboard month="2026-10" day="2026-10-26" today="2026-10-26" />);

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Panel de administración");
  });
});
