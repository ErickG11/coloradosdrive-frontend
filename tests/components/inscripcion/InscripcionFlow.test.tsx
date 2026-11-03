import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("@/lib/api/solicitudes", () => ({
  solicitudes: { courses: vi.fn(), sendCode: vi.fn(), confirmCode: vi.fn(), progress: vi.fn() },
  solicitudMessage: () => "Error de conexión",
}));
vi.mock("@/components/theme/ThemeToggle", () => ({ ThemeToggle: () => null }));
import { solicitudes } from "@/lib/api/solicitudes";
import { InscripcionFlow } from "@/components/inscripcion/InscripcionFlow";
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(solicitudes.courses).mockResolvedValue([
    { id: "a", tipo: "A", nombre: "Motos mañana", horasRequeridas: 15 },
    { id: "b", tipo: "A", nombre: "Motos tarde", horasRequeridas: 15 },
  ]);
  vi.mocked(solicitudes.sendCode).mockResolvedValue({ message: "ok" });
});
it("preselecciona por UUID y distingue nombres del mismo tipo", async () => {
  render(<InscripcionFlow initialCourseId="b" />);
  expect(await screen.findByLabelText("Curso")).toHaveValue("b");
  expect(screen.getByRole("option", { name: "Tipo A — Motos mañana" })).toBeInTheDocument();
});
it("envía correo y curso, y muestra el paso de código", async () => {
  render(<InscripcionFlow initialCourseId="a" />);
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Correo electrónico"), "ana@example.com");
  await user.click(screen.getByRole("button", { name: "Enviar código" }));
  await waitFor(() => expect(solicitudes.sendCode).toHaveBeenCalledWith("ana@example.com", "a"));
  expect(await screen.findByText("2. Verifica tu correo")).toBeInTheDocument();
});
it("avanza por teclado y lleva el foco al encabezado del paso", async () => {
  render(<InscripcionFlow />);
  const user = userEvent.setup();
  const course = await screen.findByLabelText("Curso");
  course.focus();
  await user.selectOptions(course, "a");
  await user.tab();
  expect(screen.getByLabelText("Correo electrónico")).toHaveFocus();
  await user.keyboard("ana@example.com");
  await user.tab();
  expect(screen.getByRole("button", { name: "Enviar código" })).toHaveFocus();
  await user.keyboard("{Enter}");
  await waitFor(() => expect(screen.getByText("2. Verifica tu correo")).toHaveFocus());
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
  expect(screen.getByText(/Paso 2 de 6/)).toBeInTheDocument();
});

it("recupera el curso original y reintenta progreso sin consumir otro código", async () => {
  vi.mocked(solicitudes.confirmCode).mockResolvedValue({ solicitudId: "s", token: "temporal" });
  vi.mocked(solicitudes.progress).mockRejectedValueOnce(new Error("red")).mockResolvedValue({
    courseId: "b",
    estado: "pendiente_revision",
    correoVerificado: true,
    consentimientoVigente: true,
    datosGuardados: true,
    solicitadaAt: "2026-10-01",
    requiereRepresentante: false,
    representanteCompleto: false,
    documentos: [],
  });
  const storage = vi.spyOn(Storage.prototype, "setItem");
  render(<InscripcionFlow initialCourseId="a" />);
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Correo electrónico"), "ana@example.com");
  await user.click(screen.getByRole("button", { name: "Enviar código" }));
  await user.type(await screen.findByLabelText("Código de verificación"), "012345");
  await user.click(screen.getByRole("button", { name: "Verificar código" }));
  await user.click(await screen.findByRole("button", { name: "Reintentar recuperación" }));
  expect(await screen.findByText("Curso solicitado: Motos tarde")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText("5. Documentos")).toHaveFocus());
  expect(solicitudes.confirmCode).toHaveBeenCalledTimes(1);
  expect(storage).not.toHaveBeenCalled();
  storage.mockRestore();
});
