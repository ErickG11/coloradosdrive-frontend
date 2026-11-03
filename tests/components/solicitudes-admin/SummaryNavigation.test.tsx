import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { useSolicitudSummary } from "@/components/solicitudes-admin/useSolicitudSummary";
vi.mock("@/components/solicitudes-admin/useSolicitudSummary", () => ({
  useSolicitudSummary: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
beforeEach(() => {
  vi.mocked(useSolicitudSummary).mockReturnValue({ pending: 100, notice: 1, dismiss: vi.fn() });
});
it("el contador y el aviso enlazan al módulo sin alterar otros enlaces", () => {
  render(
    <ThemeProvider>
      <Sidebar email="ficticio@example.invalid" role="admin" />
    </ThemeProvider>,
  );
  expect(screen.getByLabelText("100 solicitudes pendientes")).toHaveTextContent("99+");
  expect(screen.getByText("Nueva solicitud de inscripción")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ver" })).toHaveAttribute("href", "/admin/solicitudes");
  expect(screen.getByRole("link", { name: /Alumnos/ })).toHaveAttribute("href", "/admin/students");
});
it("la carga inicial no muestra aviso", () => {
  vi.mocked(useSolicitudSummary).mockReturnValue({ pending: 2, notice: 0, dismiss: vi.fn() });
  render(
    <ThemeProvider>
      <Sidebar email={null} role="admin" />
    </ThemeProvider>,
  );
  expect(screen.queryByText("Nueva solicitud de inscripción")).not.toBeInTheDocument();
});
it("la entrada de documentos aparece solo en el área del alumno", () => {
  render(
    <ThemeProvider>
      <Sidebar email={null} role="estudiante" />
    </ThemeProvider>,
  );
  expect(screen.getByRole("link", { name: "Mis documentos" })).toHaveAttribute(
    "href",
    "/student/documents",
  );
  expect(screen.queryByText("Nueva solicitud de inscripción")).not.toBeInTheDocument();
});
