import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { LoginForm } from "@/app/(auth)/login/LoginForm";

const { signInWithPassword, push, refresh } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(), push: vi.fn(), refresh: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithPassword } }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

beforeEach(() => vi.clearAllMocks());

it("explica que una cuenta bloqueada no puede entrar", async () => {
  signInWithPassword.mockResolvedValue({ data: null, error: { code: "user_banned" } });
  render(<LoginForm />);
  fireEvent.change(screen.getByLabelText("Correo electrónico"), {
    target: { value: "bruno@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: "temporary-password" },
  });
  await userEvent.setup().click(screen.getByRole("button", { name: "Iniciar sesión" }));
  expect(screen.getByText("Tu cuenta está inactiva. Contacta al administrador.")).toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
});
