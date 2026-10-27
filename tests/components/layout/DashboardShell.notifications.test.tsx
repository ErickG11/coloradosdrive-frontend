import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardShell } from "@/components/layout/DashboardShell";

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
    render(await DashboardShell({ children: <p>Contenido</p> }));
    expect(screen.getAllByRole("button", { name: "Campana de avisos" })).toHaveLength(1);
    expect(screen.getByRole("banner", { name: "Avisos de prácticas" })).toBeInTheDocument();
    expect(bell.mock.calls[0][0]).toMatchObject({ role });
  });
  it("admin conserva su layout sin campana", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "admin", app_metadata: { role: "admin" } } } });
    render(await DashboardShell({ children: <p>Contenido</p> }));
    expect(screen.queryByRole("button", { name: "Campana de avisos" })).not.toBeInTheDocument();
    expect(bell).not.toHaveBeenCalled();
    expect(screen.getByRole("main")).toHaveTextContent("Contenido");
  });
});
