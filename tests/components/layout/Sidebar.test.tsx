import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function renderSidebar(role: "admin" | "estudiante" | "instructor" | null) {
  return render(
    <ThemeProvider>
      <Sidebar email="ana@example.com" role={role} />
    </ThemeProvider>,
  );
}

describe("Sidebar", () => {
  it("admin: ve Cohortes, Matricular estudiante y Exámenes, pero no la sección de estudiante", () => {
    renderSidebar("admin");

    expect(screen.getAllByRole("link", { name: /Cohortes/ })).not.toHaveLength(0);
    expect(screen.getAllByRole("link", { name: /Matricular estudiante/ })).not.toHaveLength(0);
    expect(screen.getAllByRole("link", { name: /Exámenes/ }).length).toBeGreaterThan(0);
    // El link de exámenes de admin apunta a /admin/exams, no a /student/exams.
    const examLinks = screen.getAllByRole("link", { name: /Exámenes/ });
    for (const link of examLinks) {
      expect(link).toHaveAttribute("href", "/admin/exams");
    }
  });

  it("estudiante: ve solo Exámenes (su propia sección), nunca los enlaces de admin", () => {
    renderSidebar("estudiante");

    expect(screen.queryAllByRole("link", { name: /Cohortes/ })).toHaveLength(0);
    expect(screen.queryAllByRole("link", { name: /Matricular estudiante/ })).toHaveLength(0);
    const examLinks = screen.getAllByRole("link", { name: /Exámenes/ });
    expect(examLinks.length).toBeGreaterThan(0);
    for (const link of examLinks) {
      expect(link).toHaveAttribute("href", "/student/exams");
    }
  });

  it("instructor: no ve ninguna sección de navegación todavía (sin páginas propias en este sprint)", () => {
    renderSidebar("instructor");

    expect(screen.queryAllByRole("link", { name: /Cohortes/ })).toHaveLength(0);
    expect(screen.queryAllByRole("link", { name: /Exámenes/ })).toHaveLength(0);
  });
});
