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
  it("muestra el nombre de la escuela y enlaces a /login", () => {
    renderLanding([]);

    expect(screen.getAllByText(/Colorados ?Drive/).length).toBeGreaterThan(0);
    const loginLinks = screen.getAllByRole("link", { name: /Iniciar sesión/ });
    expect(loginLinks.length).toBeGreaterThan(0);
    for (const link of loginLinks) {
      expect(link).toHaveAttribute("href", "/login");
    }
  });

  it("muestra el hero con el CTA de inscripción por WhatsApp", () => {
    renderLanding([]);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Tu futuro\.\s*En marcha\./,
    );
    const enrollLinks = screen.getAllByRole("link", { name: /Inscríbete hoy/ });
    expect(enrollLinks.length).toBeGreaterThan(0);
    for (const link of enrollLinks) {
      expect(link.getAttribute("href")).toMatch(/^https:\/\/wa\.me\//);
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
