import type { Metadata } from "next";
import { resolveTitle } from "next/dist/lib/metadata/resolvers/resolve-title";
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

type Loader = () => Promise<{ metadata?: Metadata }>;

const root: Loader = () => import("@/app/layout");

// Pasa por la misma función de Next que resuelve el título real: recorre la
// cadena raíz → layouts → página y aplica la plantilla heredada de cada nivel.
async function resolvedTitle(chain: Loader[]): Promise<string> {
  let title = "";
  let template: string | null = null;
  for (const load of chain) {
    const declared = (await load()).metadata?.title;
    if (declared === undefined || declared === null) continue;
    const resolved = resolveTitle(declared, template);
    title = resolved.absolute;
    template = resolved.template;
  }
  return title;
}

const cohorts: Loader = () => import("@/app/(admin)/admin/cohorts/layout");
const exams: Loader = () => import("@/app/(admin)/admin/exams/layout");
const students: Loader = () => import("@/app/(admin)/admin/students/layout");
const instructor: Loader = () => import("@/app/(instructor)/instructor/layout");
const studentExams: Loader = () => import("@/app/(student)/student/exams/layout");

const SCREENS: Array<[string, Loader[], string]> = [
  ["login", [root, () => import("@/app/(auth)/login/page")], "Iniciar sesión · ColoradosDrive"],
  [
    "cuenta inactiva",
    [root, () => import("@/app/(auth)/account-inactive/page")],
    "Cuenta inactiva · ColoradosDrive",
  ],
  [
    "inicio de administrador",
    [root, () => import("@/app/(admin)/admin/page")],
    "Panel de administrador · ColoradosDrive",
  ],
  [
    "inicio de estudiante",
    [root, () => import("@/app/(student)/student/page")],
    "Panel de estudiante · ColoradosDrive",
  ],
  ["cohortes", [root, cohorts], "Cohortes · ColoradosDrive"],
  [
    "nueva cohorte",
    [root, cohorts, () => import("@/app/(admin)/admin/cohorts/new/layout")],
    "Nueva cohorte · ColoradosDrive",
  ],
  [
    "editar cohorte",
    [root, cohorts, () => import("@/app/(admin)/admin/cohorts/[id]/edit/layout")],
    "Editar cohorte · ColoradosDrive",
  ],
  [
    "matrícula",
    [root, () => import("@/app/(admin)/admin/enrollments/layout")],
    "Matricular estudiante · ColoradosDrive",
  ],
  ["exámenes", [root, exams], "Exámenes · ColoradosDrive"],
  [
    "nuevo examen",
    [root, exams, () => import("@/app/(admin)/admin/exams/new/layout")],
    "Nuevo examen · ColoradosDrive",
  ],
  [
    "editar examen",
    [root, exams, () => import("@/app/(admin)/admin/exams/[id]/edit/layout")],
    "Editar examen · ColoradosDrive",
  ],
  [
    "instructores",
    [root, () => import("@/app/(admin)/admin/instructors/layout")],
    "Instructores · ColoradosDrive",
  ],
  [
    "horarios (admin)",
    [root, () => import("@/app/(admin)/admin/practice-slots/layout")],
    "Horarios de práctica · ColoradosDrive",
  ],
  ["alumnos", [root, students], "Alumnos · ColoradosDrive"],
  [
    "ficha del alumno",
    [root, students, () => import("@/app/(admin)/admin/students/[id]/page")],
    "Ficha del alumno · ColoradosDrive",
  ],
  [
    "eliminaciones",
    [root, students, () => import("@/app/(admin)/admin/students/deletions/layout")],
    "Eliminaciones pendientes · ColoradosDrive",
  ],
  ["agenda del instructor", [root, instructor], "Mi agenda · ColoradosDrive"],
  [
    "clave del instructor",
    [root, instructor, () => import("@/app/(instructor)/instructor/change-password/layout")],
    "Cambiar contraseña · ColoradosDrive",
  ],
  [
    "clave del estudiante",
    [root, () => import("@/app/(student)/student/change-password/layout")],
    "Cambiar contraseña · ColoradosDrive",
  ],
  ["exámenes (estudiante)", [root, studentExams], "Exámenes · ColoradosDrive"],
  [
    "rendir examen",
    [root, studentExams, () => import("@/app/(student)/student/exams/[id]/layout")],
    "Examen · ColoradosDrive",
  ],
  [
    "horarios (estudiante)",
    [root, () => import("@/app/(student)/student/schedule/layout")],
    "Horarios de práctica · ColoradosDrive",
  ],
  // La landing y la 404 viven en el segmento raíz.
  ["404", [root, () => import("@/app/not-found")], "Página no encontrada · ColoradosDrive"],
];

describe("títulos de pantalla", () => {
  it("el layout raíz usa una plantilla con el nombre de la aplicación", async () => {
    const { metadata } = await import("@/app/layout");

    expect(metadata.title).toEqual({
      default: "ColoradosDrive",
      template: "%s · ColoradosDrive",
    });
  });

  it("la landing lleva su propio título, sin plantilla", async () => {
    const landing = await import("@/app/page");

    expect(landing.metadata.title).toBe("ColoradosDrive · Escuela de conducción");
  });

  it.each(SCREENS)("%s termina con el nombre de la aplicación", async (_name, chain, title) => {
    expect(await resolvedTitle(chain)).toBe(title);
  });

  it("un layout padre con string perdería el sufijo (por eso usan title.default)", () => {
    const parent = resolveTitle("Cohortes", "%s · ColoradosDrive");
    expect(parent.template).toBeNull();
  });
});
