import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "font-inter" }),
  Space_Grotesk: () => ({ variable: "font-space-grotesk" }),
}));
// Las páginas de servidor importan módulos que no se ejecutan aquí.
vi.mock("@/lib/api/publicCourses", () => ({ getPublicCourses: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/app/(admin)/admin/students/StudentDetail", () => ({ StudentDetail: () => null }));
vi.mock("@/components/layout/DashboardShell", () => ({ DashboardShell: () => null }));

// Los títulos se definen por pantalla (layout o página de servidor); la
// plantilla del layout raíz les agrega « · ColoradosDrive».
const SCREENS: Array<[string, () => Promise<{ metadata?: { title?: unknown } }>, string]> = [
  ["login", () => import("@/app/(auth)/login/page"), "Iniciar sesión"],
  ["cuenta inactiva", () => import("@/app/(auth)/account-inactive/page"), "Cuenta inactiva"],
  ["inicio de administrador", () => import("@/app/(admin)/admin/page"), "Panel de administrador"],
  ["inicio de estudiante", () => import("@/app/(student)/student/page"), "Panel de estudiante"],
  ["ficha del alumno", () => import("@/app/(admin)/admin/students/[id]/page"), "Ficha del alumno"],
  ["cohortes", () => import("@/app/(admin)/admin/cohorts/layout"), "Cohortes"],
  ["nueva cohorte", () => import("@/app/(admin)/admin/cohorts/new/layout"), "Nueva cohorte"],
  [
    "editar cohorte",
    () => import("@/app/(admin)/admin/cohorts/[id]/edit/layout"),
    "Editar cohorte",
  ],
  ["matrícula", () => import("@/app/(admin)/admin/enrollments/layout"), "Matricular estudiante"],
  ["exámenes", () => import("@/app/(admin)/admin/exams/layout"), "Exámenes"],
  ["nuevo examen", () => import("@/app/(admin)/admin/exams/new/layout"), "Nuevo examen"],
  ["editar examen", () => import("@/app/(admin)/admin/exams/[id]/edit/layout"), "Editar examen"],
  ["instructores", () => import("@/app/(admin)/admin/instructors/layout"), "Instructores"],
  [
    "horarios (admin)",
    () => import("@/app/(admin)/admin/practice-slots/layout"),
    "Horarios de práctica",
  ],
  ["alumnos", () => import("@/app/(admin)/admin/students/layout"), "Alumnos"],
  [
    "eliminaciones",
    () => import("@/app/(admin)/admin/students/deletions/layout"),
    "Eliminaciones pendientes",
  ],
  ["agenda del instructor", () => import("@/app/(instructor)/instructor/layout"), "Mi agenda"],
  [
    "clave del instructor",
    () => import("@/app/(instructor)/instructor/change-password/layout"),
    "Cambiar contraseña",
  ],
  [
    "clave del estudiante",
    () => import("@/app/(student)/student/change-password/layout"),
    "Cambiar contraseña",
  ],
  ["exámenes (estudiante)", () => import("@/app/(student)/student/exams/layout"), "Exámenes"],
  ["rendir examen", () => import("@/app/(student)/student/exams/[id]/layout"), "Examen"],
  [
    "horarios (estudiante)",
    () => import("@/app/(student)/student/schedule/layout"),
    "Horarios de práctica",
  ],
];

describe("títulos de pantalla", () => {
  it("el layout raíz usa una plantilla con el nombre de la aplicación", async () => {
    const { metadata } = await import("@/app/layout");

    expect(metadata.title).toEqual({
      default: "ColoradosDrive",
      template: "%s · ColoradosDrive",
    });
  });

  it("la landing lleva su propio título y la 404 el suyo", async () => {
    const landing = await import("@/app/page");
    const notFound = await import("@/app/not-found");

    expect(landing.metadata.title).toBe("ColoradosDrive · Escuela de conducción");
    expect(notFound.metadata.title).toBe("Página no encontrada");
  });

  it.each(SCREENS)("%s define su título", async (_name, load, title) => {
    const { metadata } = await load();

    expect(metadata?.title).toBe(title);
  });
});
