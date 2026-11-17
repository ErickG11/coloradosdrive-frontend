import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StudentIdentityConfirmation } from "@/app/(admin)/admin/students/StudentIdentityConfirmation";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn() } }));
const onClose = vi.fn();
const onSaved = vi.fn();
const onReload = vi.fn();
function show() {
  render(
    <StudentIdentityConfirmation studentId="uuid" onClose={onClose} onSaved={onSaved} onReload={onReload} />,
  );
}
beforeEach(() => vi.clearAllMocks());

describe("StudentIdentityConfirmation", () => {
  it("permite confirmar sin observación y sin hablar del plazo del instructor", async () => {
    vi.mocked(api.post).mockResolvedValue({ transicion: true });
    show();
    expect(screen.queryByText(/plazo del instructor/i)).not.toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Confirmar identidad" });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(vi.mocked(api.post).mock.calls[0].slice(0, 2)).toEqual([
      "/admin/estudiantes/uuid/identidad-presencial",
      {},
    ]);
  });
  it("una observación de menos de 10 caracteres bloquea el botón; con 10 o más lo habilita", () => {
    show();
    const field = screen.getByLabelText(/Observación/);
    fireEvent.change(field, { target: { value: "corta" } });
    expect(screen.getByRole("button", { name: "Confirmar identidad" })).toBeDisabled();
    fireEvent.change(field, { target: { value: "Se revisó en recepción" } });
    expect(screen.getByRole("button", { name: "Confirmar identidad" })).toBeEnabled();
  });
  it("envía la observación normalizada", async () => {
    vi.mocked(api.post).mockResolvedValue({ transicion: true });
    show();
    fireEvent.change(screen.getByLabelText(/Observación/), { target: { value: "  Se revisó   en recepción " } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar identidad" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(vi.mocked(api.post).mock.calls[0][1]).toEqual({ motivo: "Se revisó en recepción" });
  });
  it("muestra el error del servidor y pide recargar si la matrícula ya no aplica", async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError("x", 409, { code: "ALUMNO_SIN_SOLICITUD" }));
    show();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar identidad" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("no proviene de una solicitud");
    fireEvent.click(screen.getByRole("button", { name: "Recargar ficha" }));
    expect(onReload).toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
