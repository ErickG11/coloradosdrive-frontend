import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import { LandingPage } from "@/components/landing/LandingPage";
import { RequirementsSection } from "@/components/landing/RequirementsSection";
import { ScheduleSection } from "@/components/landing/ScheduleSection";
import { landingContent } from "@/lib/content/landing";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { getPublicCourses } from "@/lib/api/publicCourses";
import type { PublicCourse } from "@/types/publicCourse";

// jsdom no implementa IntersectionObserver: lo necesita `whileInView` de
// motion (usado por ScrollReveal) para animar las secciones al hacer scroll.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeAll(() => {
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  vi.stubGlobal("matchMedia", (media: string) => ({
    media,
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

function renderLanding(courses: PublicCourse[]) {
  return render(
    <ThemeProvider>
      <LandingPage courses={courses} />
    </ThemeProvider>,
  );
}

function buildCourse(overrides: Partial<PublicCourse> = {}): PublicCourse {
  return {
    id: "course-a",
    tipo: "A",
    nombre: "Motocicletas",
    horasRequeridas: 40,
    ...overrides,
  };
}

describe("LandingPage", () => {
  it("muestra el nombre de la escuela y enlaces a /login", () => {
    renderLanding([]);

    expect(screen.getAllByText(/Colorados ?Drive/).length).toBeGreaterThan(0);
    const loginLinks = screen.getAllByRole("link", { name: /Iniciar sesión/ });
    expect(loginLinks.length).toBeGreaterThan(0);
    for (const link of loginLinks) {
      expect(link).toHaveAttribute("href", "/login");
    }
  });

  it("muestra el hero y el bloque final con inscripción en línea", () => {
    renderLanding([]);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Tu futuro\.\s*En marcha\./,
    );
    const enrollLinks = screen.getAllByRole("link", { name: /Inscríbete hoy/ });
    expect(enrollLinks).toHaveLength(2);
    for (const link of enrollLinks) {
      expect(link).toHaveAttribute("href", "/inscripcion");
    }
  });

  it("muestra los dos cursos con las horas requeridas que entrega el backend", () => {
    renderLanding([
      buildCourse({ id: "course-a", tipo: "A", nombre: "Motocicletas", horasRequeridas: 40 }),
      buildCourse({
        id: "course-b",
        tipo: "B",
        nombre: "Vehículos livianos",
        horasRequeridas: 60,
      }),
    ]);

    expect(screen.getByRole("heading", { name: "Licencia Tipo A" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Licencia Tipo B" })).toBeInTheDocument();
    expect(screen.getByText("40 horas requeridas")).toBeInTheDocument();
    expect(screen.getByText("60 horas requeridas")).toBeInTheDocument();
  });

  it("si el backend no entrega cursos, invita a consultar la próxima cohorte", () => {
    renderLanding([]);

    expect(screen.getAllByText("Consulta la próxima cohorte")).toHaveLength(2);
  });

  // La landing ya no monta estas secciones: se verifica su contenido fijo por separado.
  it("la sección de requisitos muestra los 4 requisitos de inscripción fijos", () => {
    render(<RequirementsSection />);

    expect(screen.getByText("Cédula de identidad")).toBeInTheDocument();
    expect(screen.getByText("Papeleta de votación")).toBeInTheDocument();
    expect(screen.getByText("Certificado de tipo de sangre")).toBeInTheDocument();
    expect(
      screen.getByText("Título de bachiller o certificado de estudios hasta décimo año"),
    ).toBeInTheDocument();
  });

  it("la sección de horario muestra el horario de prácticas fijo", () => {
    render(<ScheduleSection />);

    expect(screen.getByText("Todos los días, de 06:00 a 22:00.")).toBeInTheDocument();
  });
});

const courseAId = "11111111-1111-4111-8111-111111111111";
const courseBId = "22222222-2222-4222-8222-222222222222";
const courseA = buildCourse({ id: courseAId, tipo: "A" });
const courseB = buildCourse({ id: courseBId, tipo: "B" });
const otherA = buildCourse({ id: "33333333-3333-4333-8333-333333333333", tipo: "A" });
const otherB = buildCourse({ id: "44444444-4444-4444-8444-444444444444", tipo: "B" });

function expectCourseLinks(hrefA: string, hrefB: string) {
  expect(screen.getByRole("link", { name: "Inscribirme en Licencia Tipo A" })).toHaveAttribute(
    "href",
    hrefA,
  );
  expect(screen.getByRole("link", { name: "Inscribirme en Licencia Tipo B" })).toHaveAttribute(
    "href",
    hrefB,
  );
}

describe("enlaces de inscripción de la landing real", () => {
  it("cubre menú desktop, menú móvil, hero, tarjetas, prácticas y bloque final", async () => {
    renderLanding([courseB, courseA]);
    // jsdom conserva el CSS móvil: inspeccionar también el CTA desktop oculto.
    const menuEnrollmentLinks = within(screen.getByRole("banner"))
      .getAllByRole("link", { hidden: true })
      .filter((link) => link.textContent?.trim() === "Inscríbete");
    expect(menuEnrollmentLinks).toHaveLength(2);
    const [desktopLink] = menuEnrollmentLinks;
    expect(desktopLink).toHaveAttribute("href", "/inscripcion");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    const mobileLink = within(
      screen.getByRole("navigation", { name: "Navegación móvil" }),
    ).getByRole("link", { name: "Inscríbete" });
    expect(mobileLink).toHaveAttribute("href", "/inscripcion");
    expect(mobileLink.querySelector("svg")?.outerHTML).toBe(
      desktopLink.querySelector("svg")?.outerHTML,
    );
    expect(screen.queryByText("Inscríbete por WhatsApp")).not.toBeInTheDocument();
    expectCourseLinks(`/inscripcion?courseId=${courseAId}`, `/inscripcion?courseId=${courseBId}`);
    // La consulta por prácticas pasó a ser un contacto por WhatsApp, no una inscripción.
    const practiceLink = screen.getByRole("link", { name: "Consulta por tus prácticas" });
    expect(practiceLink).toHaveAttribute("href", landingContent.whatsappEnrollmentHref);
    expect(practiceLink).toHaveAttribute("target", "_blank");
    const enrollmentLinks = screen
      .getAllByRole("link", { hidden: true })
      .filter((link) =>
        /Inscríbete|Inscribirme/.test(link.getAttribute("aria-label") ?? link.textContent ?? ""),
      );
    expect(enrollmentLinks).toHaveLength(6);
    for (const link of enrollmentLinks) {
      expect(link.getAttribute("href")).toMatch(/^\/inscripcion(?:\?courseId=[a-f0-9-]+)?$/);
      expect(link.getAttribute("href")).not.toContain("wa.me");
      expect(link).not.toHaveAttribute("target", "_blank");
    }
  });

  it.each([
    {
      name: "un curso único por tipo, independientemente del orden",
      courses: [courseB, courseA],
      hrefA: `/inscripcion?courseId=${courseAId}`,
      hrefB: `/inscripcion?courseId=${courseBId}`,
    },
    { name: "lista vacía", courses: [], hrefA: "/inscripcion", hrefB: "/inscripcion" },
    {
      name: "falta Tipo B",
      courses: [courseA],
      hrefA: `/inscripcion?courseId=${courseAId}`,
      hrefB: "/inscripcion",
    },
    {
      name: "Tipo A ambiguo",
      courses: [courseA, otherA, courseB],
      hrefA: "/inscripcion",
      hrefB: `/inscripcion?courseId=${courseBId}`,
    },
    {
      name: "Tipo B ambiguo",
      courses: [courseA, courseB, otherB],
      hrefA: `/inscripcion?courseId=${courseAId}`,
      hrefB: "/inscripcion",
    },
    {
      name: "ambos tipos ambiguos",
      courses: [courseA, otherA, courseB, otherB],
      hrefA: "/inscripcion",
      hrefB: "/inscripcion",
    },
  ])("resuelve las tarjetas con $name", ({ courses, hrefA, hrefB }) => {
    renderLanding(courses);
    expectCourseLinks(hrefA, hrefB);
  });

  it.each(["error HTTP", "backend caído"])(
    "mantiene la inscripción disponible ante %s",
    async (failure) => {
      const fetcher = vi.spyOn(globalThis, "fetch");
      try {
        if (failure === "backend caído") fetcher.mockRejectedValueOnce(new Error("network error"));
        else fetcher.mockResolvedValueOnce(new Response("{}", { status: 503 }));
        renderLanding(await getPublicCourses());
        expectCourseLinks("/inscripcion", "/inscripcion");
        for (const link of screen.getAllByRole("link", {
          name: /Inscríbete|Inscribirme/,
        })) {
          expect(link).toHaveAttribute("href", "/inscripcion");
        }
      } finally {
        fetcher.mockRestore();
      }
    },
  );

  it("conserva los cuatro enlaces de contacto de WhatsApp con sus teléfonos y mensajes", () => {
    renderLanding([courseA, courseB]);
    const contact = screen.getByRole("region", { name: /Tu camino.*empieza aquí/ });
    const footer = screen.getByRole("contentinfo");
    const message = encodeURIComponent(
      "Hola, Colorados Drive. Quiero información para inscribirme en un curso de conducción.",
    );
    for (const phone of [
      { display: "0992042546", international: "593992042546" },
      { display: "0997913888", international: "593997913888" },
    ]) {
      const href = `https://wa.me/${phone.international}?text=${message}`;
      for (const link of [
        within(contact).getByRole("link", { name: new RegExp(phone.display) }),
        within(footer).getByRole("link", { name: `WhatsApp · ${phone.display}` }),
      ]) {
        expect(link).toHaveAttribute("href", href);
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      }
    }
    // Además de los cuatro contactos, la nota de cursos y la consulta de prácticas usan el
    // mensaje genérico hacia el primer número.
    const whatsappLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("https://wa.me/"));
    expect(whatsappLinks).toHaveLength(6);
    expect(
      whatsappLinks.filter(
        (link) => link.getAttribute("href") === landingContent.whatsappEnrollmentHref,
      ),
    ).toHaveLength(4);
  });

  it("conserva las dos notas informativas sobre WhatsApp", () => {
    renderLanding([]);
    const note = screen.getByText(
      (_, element) =>
        element?.tagName === "P" &&
        element.textContent === "Valores sin IVA. Consulta fechas y cohortes por WhatsApp.",
    );
    expect(within(note).getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      landingContent.whatsappEnrollmentHref,
    );
    expect(
      screen.getByText("Elige tu curso y consulta la próxima cohorte por WhatsApp."),
    ).toBeInTheDocument();
  });
});
