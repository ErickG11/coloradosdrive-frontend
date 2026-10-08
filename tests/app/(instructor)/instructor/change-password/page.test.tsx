import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import Page from "@/app/(instructor)/instructor/change-password/page";
import { api } from "@/lib/api/client";

const { replace, refresh, signOut } = vi.hoisted(() => ({
  replace: vi.fn(), refresh: vi.fn(), signOut: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signOut } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn() } }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.post).mockResolvedValue(undefined);
  signOut.mockResolvedValue({ error: null });
});

it("cambia la clave temporal por el endpoint del instructor y cierra la sesión local", async () => {
  const user = userEvent.setup();
  render(<Page />);
  fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
    target: { value: "new-local-password" },
  });
  fireEvent.change(screen.getByLabelText("Confirmar nueva contraseña"), {
    target: { value: "new-local-password" },
  });
  await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));
  expect(api.post).toHaveBeenCalledWith("/instructores/cambiar-password", {
    nuevaPassword: "new-local-password",
  });
  await screen.findByRole("status");
  expect(signOut).toHaveBeenCalledWith({ scope: "local" });
});

it("no envía claves que no coinciden", async () => {
  const user = userEvent.setup();
  render(<Page />);
  fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
    target: { value: "new-local-password" },
  });
  fireEvent.change(screen.getByLabelText("Confirmar nueva contraseña"), {
    target: { value: "different-password" },
  });
  await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Las contraseñas no coinciden.");
  expect(api.post).not.toHaveBeenCalled();
});
