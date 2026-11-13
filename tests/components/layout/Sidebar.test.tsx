import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const navigation = vi.hoisted(() => ({ path: "/admin" }));
beforeEach(() => {
  navigation.path = "/admin";
  localStorage.clear();
});
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.path,
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
  it.each(["admin", "estudiante", "instructor"] as const)(
    "%s comparte el estilo y el pie del menú",
    (role) => {
      renderSidebar(role);
      const sidebar = screen.getByRole("complementary", { name: "Barra lateral" });
      expect(sidebar.className).toMatch(/admin/);
      expect(sidebar.className).toContain("w-[var(--sidebar-w)]");
      expect(within(sidebar).getByAltText("Colorados Drive")).toBeInTheDocument();
      expect(screen.getByText("ana@example.com")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cerrar sesión/ })).toBeInTheDocument();
    },
  );
  it("instructor se pliega conservando enlaces accesibles, logo y estado activo", () => {
    navigation.path = "/instructor/asistencias";
    renderSidebar("instructor");
    expect(screen.getByRole("link", { name: "Asistencias" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Mi agenda" })).not.toHaveAttribute("aria-current");
    fireEvent.click(screen.getByRole("button", { name: "Contraer menú" }));
    expect(document.body).toHaveAttribute("data-sidebar", "collapsed");
    expect(screen.getByRole("link", { name: "Asistencias" })).toHaveAttribute(
      "title",
      "Asistencias",
    );
    expect(screen.getByAltText("Colorados Drive")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expandir menú" }));
    expect(document.body).not.toHaveAttribute("data-sidebar");
  });
  it.each(["admin", "estudiante", "instructor", null] as const)(
    "historial propio solo para estudiante: %s",
    (role) => {
      renderSidebar(role);
      const links = screen.queryAllByRole("link", { name: "Mi historial de asistencia" });
      expect(links).toHaveLength(role === "estudiante" ? 1 : 0);
      for (const link of links) expect(link).toHaveAttribute("href", "/student/history");
    },
  );
  it.each(["admin", "estudiante", "instructor", null] as const)(
    "Alumnos solo aparece para admin: %s",
    (role) => {
      renderSidebar(role);
      const links = screen.queryAllByRole("link", { name: /Alumnos/ });
      expect(links.length).toBe(role === "admin" ? 1 : 0);
      for (const link of links) expect(link).toHaveAttribute("href", "/admin/students");
    },
  );
  it("admin: ve Cohortes, Matricular estudiante, Exámenes y Horarios de práctica, pero no la sección de estudiante", () => {
    renderSidebar("admin");

    expect(screen.getAllByRole("link", { name: /Cohortes/ })).not.toHaveLength(0);
    expect(screen.getAllByRole("link", { name: /Matricular estudiante/ })).not.toHaveLength(0);
    expect(screen.getAllByRole("link", { name: /Exámenes/ }).length).toBeGreaterThan(0);
    // El link de exámenes de admin apunta a /admin/exams, no a /student/exams.
    const examLinks = screen.getAllByRole("link", { name: /Exámenes/ });
    for (const link of examLinks) {
      expect(link).toHaveAttribute("href", "/admin/exams");
    }
    for (const link of screen.getAllByRole("link", { name: /Horarios de práctica/ })) {
      expect(link).toHaveAttribute("href", "/admin/practice-slots");
    }
  });

  it("estudiante: ve Mi curso (exámenes y contenido) y Horarios de práctica (su propia sección), nunca los enlaces de admin", () => {
    renderSidebar("estudiante");

    expect(screen.queryAllByRole("link", { name: /Cohortes/ })).toHaveLength(0);
    expect(screen.queryAllByRole("link", { name: /Matricular estudiante/ })).toHaveLength(0);
    const courseLinks = screen.getAllByRole("link", { name: /Mi curso/ });
    expect(courseLinks.length).toBeGreaterThan(0);
    for (const link of courseLinks) {
      expect(link).toHaveAttribute("href", "/student/course");
    }
    for (const link of screen.getAllByRole("link", { name: /Horarios de práctica/ })) {
      expect(link).toHaveAttribute("href", "/student/schedule");
    }
  });

  it("instructor: ve Mi agenda (su primera pantalla real) y Cambiar contraseña, nada de lo de admin/estudiante", () => {
    renderSidebar("instructor");

    expect(screen.queryAllByRole("link", { name: /Cohortes/ })).toHaveLength(0);
    expect(screen.queryAllByRole("link", { name: /Exámenes/ })).toHaveLength(0);
    // El enlace usa el mismo nombre que el título de la página.
    expect(screen.queryAllByRole("link", { name: /Horarios de práctica/ })).toHaveLength(0);
    const scheduleLinks = screen.getAllByRole("link", { name: "Mi agenda" });
    expect(scheduleLinks.length).toBeGreaterThan(0);
    for (const link of scheduleLinks) {
      expect(link).toHaveAttribute("href", "/instructor");
    }
    const passwordLinks = screen.getAllByRole("link", { name: "Cambiar contraseña" });
    expect(passwordLinks.length).toBeGreaterThan(0);
    for (const link of passwordLinks) {
      expect(link).toHaveAttribute("href", "/instructor/change-password");
    }
    const attendanceLinks = screen.getAllByRole("link", { name: "Asistencias" });
    expect(attendanceLinks.length).toBeGreaterThan(0);
    for (const link of attendanceLinks) {
      expect(link).toHaveAttribute("href", "/instructor/asistencias");
      expect(
        scheduleLinks[0].compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        link.compareDocumentPosition(passwordLinks[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(screen.getAllByRole("link")).toHaveLength(
      scheduleLinks.length + passwordLinks.length + attendanceLinks.length,
    );
  });
});

it("muestra solicitudes solo al administrador", () => {
  renderSidebar("admin");
  expect(screen.getByRole("link", { name: "Solicitudes de inscripción" })).toHaveAttribute(
    "href",
    "/admin/solicitudes",
  );
});

it("C09: alumno con acceso ve todos los módulos y Mi inscripción", () => {
  renderSidebar("estudiante");
  for (const name of [
    "Mi panel",
    "Mi inscripción",
    "Mi curso",
    "Exámenes",
    "Horarios de práctica",
    "Documentos para llevar",
    "Mi historial de asistencia",
    "Cambiar contraseña",
  ])
    expect(screen.getByRole("link", { name })).toBeInTheDocument();
});
it("C09: sin acceso conserva Mi inscripción y oculta los módulos protegidos", () => {
  render(
    <ThemeProvider>
      <Sidebar email="ana@example.com" role="estudiante" studentEnrollmentRestricted />
    </ThemeProvider>,
  );
  expect(screen.getByRole("link", { name: "Mi inscripción" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Exámenes" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Mi curso" })).not.toBeInTheDocument();
});
