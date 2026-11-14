import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const { getUser, bell } = vi.hoisted(() => ({ getUser: vi.fn(), bell: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock("@/components/layout/Sidebar", () => ({ Sidebar: () => <aside>Menú</aside> }));
vi.mock("@/components/notifications/NotificationBell", () => ({ NotificationBell: bell }));

describe("campana en el layout por rol", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bell.mockImplementation(() => <button>Campana de avisos</button>);
  });
  it.each(["estudiante", "instructor"])("la monta una sola vez para %s", async (role) => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "fixture@example.invalid", app_metadata: { role } } },
    });
    render(<ThemeProvider>{await DashboardShell({ children: <p>Contenido</p> })}</ThemeProvider>);
    expect(screen.getAllByRole("button", { name: "Campana de avisos" })).toHaveLength(1);
    expect(screen.getByRole("banner", { name: "Avisos" })).toBeInTheDocument();
    expect(bell.mock.calls[0][0]).toMatchObject({ role });
  });
  it("admin también tiene campana (recibe avisos de faltas) y conserva su contenido", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "admin", app_metadata: { role: "admin" } } } });
    render(<ThemeProvider>{await DashboardShell({ children: <p>Contenido</p> })}</ThemeProvider>);
    expect(screen.getAllByRole("button", { name: "Campana de avisos" })).toHaveLength(1);
    expect(bell.mock.calls[0][0]).toMatchObject({ role: "admin" });
    expect(screen.getByRole("main")).toHaveTextContent("Contenido");
  });
});
