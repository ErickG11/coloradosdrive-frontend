import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LandingPage } from "@/components/landing/LandingPage";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
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
  it("muestra el header con el nombre de la escuela y un enlace a /login", () => {
    renderLanding([]);

    expect(screen.getAllByText("ColoradosDrive").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/login");
  });

  it("muestra el hero con un CTA a la sección de cursos", () => {
    renderLanding([]);

    expect(
      screen.getByRole("heading", {
        name: "Conviértete en conductor certificado, con acompañamiento real en cada clase.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver cursos disponibles" })).toHaveAttribute(
      "href",
      "#cursos",
    );
  });

  it("renderiza una tarjeta por curso público, con el botón de inscripción deshabilitado", () => {
    renderLanding([
      buildCourse({ id: "course-a", tipo: "A", nombre: "Motocicletas", horasRequeridas: 40 }),
      buildCourse({
        id: "course-b",
        tipo: "B",
        nombre: "Vehículos livianos",
        horasRequeridas: 60,
      }),
    ]);

    expect(screen.getByText("Motocicletas")).toBeInTheDocument();
    expect(screen.getByText("Vehículos livianos")).toBeInTheDocument();
    expect(screen.getByText("40 horas requeridas")).toBeInTheDocument();

    const enrollButtons = screen.getAllByRole("button", { name: /Solicitar inscripción/ });
    expect(enrollButtons).toHaveLength(2);
    for (const button of enrollButtons) {
      expect(button).toBeDisabled();
    }
  });

  it("muestra un mensaje si no hay cursos disponibles (p.ej. el backend no respondió)", () => {
    renderLanding([]);

    expect(
      screen.getByText(
        "No pudimos cargar los cursos disponibles en este momento. Intenta de nuevo más tarde.",
      ),
    ).toBeInTheDocument();
  });

  it("muestra los 4 requisitos de inscripción fijos", () => {
    renderLanding([]);

    expect(screen.getByText("Cédula de identidad")).toBeInTheDocument();
    expect(screen.getByText("Papeleta de votación")).toBeInTheDocument();
    expect(screen.getByText("Certificado de tipo de sangre")).toBeInTheDocument();
    expect(
      screen.getByText("Título de bachiller o certificado de estudios hasta décimo año"),
    ).toBeInTheDocument();
  });

  it("muestra el horario de prácticas fijo", () => {
    renderLanding([]);

    expect(screen.getByText("Todos los días, de 06:00 a 22:00.")).toBeInTheDocument();
  });
});
