import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/lib/api/inscripcion", async (original) => ({
  ...(await original<typeof import("@/lib/api/inscripcion")>()),
  getInscripcionConfig: vi.fn(),
}));
vi.mock("@/components/theme/ThemeToggle", () => ({ ThemeToggle: () => null }));
import { getInscripcionConfig } from "@/lib/api/inscripcion";
import { InscripcionWizard } from "@/components/inscripcion/InscripcionWizard";
import type { InscripcionConfig } from "@/types/inscripcion";

const config: InscripcionConfig = {
  inscripcionesAbiertas: true,
  cursos: [{ id: "a", tipo: "A", nombre: "Motos", edadMinima: 18 }],
  versionAviso: "v1",
  versionTerminos: "v1",
  contactoDerechos: "privacidad@example.invalid",
  retencionDias: 30,
  umbralBachillerReciente: 12,
  documentosFisicos: [],
  captcha: { provider: "off", siteKey: null },
};

beforeEach(() => vi.clearAllMocks());

it("muestra la insignia «Modo demostración» cuando el backend envía demo:true", async () => {
  vi.mocked(getInscripcionConfig).mockResolvedValue({ ...config, demo: true });
  render(<InscripcionWizard initialCourseId="" />);
  expect(await screen.findByText("Modo demostración")).toBeInTheDocument();
});

it("no muestra la insignia sin demo", async () => {
  vi.mocked(getInscripcionConfig).mockResolvedValue(config);
  render(<InscripcionWizard initialCourseId="" />);
  await screen.findByText(/Requisitos|Solicitar inscripción/);
  await vi.waitFor(() => expect(getInscripcionConfig).toHaveBeenCalled());
  expect(screen.queryByText("Modo demostración")).not.toBeInTheDocument();
});
