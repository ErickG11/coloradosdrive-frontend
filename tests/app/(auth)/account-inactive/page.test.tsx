import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import AccountInactivePage from "@/app/(auth)/account-inactive/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }));

it("ofrece cerrar sesión en vez de un enlace a /login (que rebotaría con sesión vigente)", () => {
  render(<AccountInactivePage />);
  expect(screen.getByRole("heading", { level: 1, name: "Cuenta inactiva" })).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Tu cuenta está inactiva");
  expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
