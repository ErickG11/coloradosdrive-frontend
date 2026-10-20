import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { LoginForm } from "@/app/(auth)/login/LoginForm";

const { signInWithPassword, signOut, push, refresh } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(), signOut: vi.fn(), push: vi.fn(), refresh: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithPassword, signOut } }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/supabase/getUserRole", () => ({
  getUserRole: (user: { role?: string }) => user.role ?? null,
}));

async function submit(email = "bruno@example.com", password = "temporary-password") {
  fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: password } });
  await userEvent.setup().click(screen.getByRole("button", { name: "Iniciar sesión" }));
}

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

it("declara method=post para que la contraseña nunca viaje en la URL", () => {
  const { container } = render(<LoginForm />);
  expect(container.querySelector("form")).toHaveAttribute("method", "post");
});

it("anuncia las credenciales incorrectas con role=alert y enfoca el correo sin borrarlo", async () => {
  signInWithPassword.mockResolvedValue({ data: null, error: { code: "invalid_credentials" } });
  render(<LoginForm />);
  await submit("ana@example.com", "mala");
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Correo o contraseña incorrectos.");
  expect(screen.getByLabelText("Correo electrónico")).toHaveFocus();
  expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ana@example.com");
  expect(screen.getByLabelText("Contraseña")).toHaveValue("mala");
  expect(push).not.toHaveBeenCalled();
});

it("anuncia la cuenta inactiva con role=alert y enfoca el correo", async () => {
  signInWithPassword.mockResolvedValue({ data: null, error: { code: "user_banned" } });
  render(<LoginForm />);
  await submit();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Tu cuenta está inactiva. Contacta al administrador.",
  );
  expect(screen.getByLabelText("Correo electrónico")).toHaveFocus();
  expect(signOut).not.toHaveBeenCalled(); // el login falló: no se creó sesión
});

it("anuncia la cuenta sin rol con role=alert y enfoca el correo", async () => {
  signInWithPassword.mockResolvedValue({ data: { user: {} }, error: null });
  render(<LoginForm />);
  await submit();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Tu cuenta no tiene un rol asignado. Contacta al administrador.",
  );
  expect(screen.getByLabelText("Correo electrónico")).toHaveFocus();
  expect(signOut).toHaveBeenCalledTimes(1);
});

it("tras un intento fallido y uno válido, limpia el error y redirige al home del rol", async () => {
  signInWithPassword.mockResolvedValueOnce({ data: null, error: { code: "invalid_credentials" } });
  render(<LoginForm />);
  await submit();
  await screen.findByRole("alert");
  (screen.getByLabelText("Contraseña") as HTMLInputElement).focus();
  signInWithPassword.mockResolvedValueOnce({ data: { user: { role: "admin" } }, error: null });
  await userEvent.setup().click(screen.getByRole("button", { name: "Iniciar sesión" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/admin"));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("devuelve el foco al correo en cada intento fallido", async () => {
  signInWithPassword.mockResolvedValue({ data: null, error: { code: "invalid_credentials" } });
  render(<LoginForm />);
  await submit();
  await screen.findByRole("alert");
  (screen.getByLabelText("Contraseña") as HTMLInputElement).focus();
  await userEvent.setup().click(screen.getByRole("button", { name: "Iniciar sesión" }));
  await waitFor(() => expect(screen.getByLabelText("Correo electrónico")).toHaveFocus());
});

it("relaciona el error con ambos campos sin duplicar el anuncio", async () => {
  signInWithPassword.mockResolvedValue({ data: null, error: { code: "invalid_credentials" } });
  render(<LoginForm />);
  expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("aria-invalid", "false");
  await submit();
  const alert = await screen.findByRole("alert");
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  for (const label of ["Correo electrónico", "Contraseña"]) {
    expect(screen.getByLabelText(label)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(label)).toHaveAttribute("aria-describedby", alert.id);
  }
});

it("pide en español el correo vacío y no llama al servidor", async () => {
  render(<LoginForm />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Iniciar sesión" }));
  expect((screen.getByLabelText("Correo electrónico") as HTMLInputElement).validationMessage).toBe(
    "Completa este campo.",
  );
  expect(signInWithPassword).not.toHaveBeenCalled();
});
