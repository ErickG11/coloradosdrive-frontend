import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import Page from "@/app/(student)/student/change-password/page";
import { api } from "@/lib/api/client";
const { replace, refresh } = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.post).mockResolvedValue({});
});
it("exige coincidencia y usa la API autenticada existente", async () => {
  const user = userEvent.setup();
  render(<Page />);
  fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
    target: { value: "new-local-password" },
  });
  fireEvent.change(screen.getByLabelText("Confirmar nueva contraseña"), {
    target: { value: "new-local-password" },
  });
  await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));
  expect(api.post).toHaveBeenCalledWith("/estudiantes/cambiar-password", {
    nuevaPassword: "new-local-password",
  });
  expect(replace).toHaveBeenCalledWith("/student");
});
it("no envía contraseñas que no coinciden", async () => {
  const user = userEvent.setup();
  render(<Page />);
  fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
    target: { value: "new-local-password" },
  });
  fireEvent.change(screen.getByLabelText("Confirmar nueva contraseña"), {
    target: { value: "different-password" },
  });
  await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));
  await screen.findByRole("alert");
  expect(api.post).not.toHaveBeenCalled();
});
