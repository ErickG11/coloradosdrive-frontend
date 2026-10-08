import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { updateSession } from "@/lib/supabase/middleware";
import { proxy } from "@/proxy";
import type { Role } from "@/types/user";

vi.mock("@/lib/supabase/middleware", () => ({ updateSession: vi.fn() }));

const mockedUpdateSession = vi.mocked(updateSession);
const fetchMock = vi.fn();

function session(role: Role) {
  mockedUpdateSession.mockResolvedValue({
    supabaseResponse: NextResponse.next(),
    user: { app_metadata: { role } },
    accessToken: "test-token",
  } as unknown as Awaited<ReturnType<typeof updateSession>>);
}

async function visit(path: string) {
  return proxy(new NextRequest(`http://localhost:3001${path}`));
}

describe("proxy por rol y estado del instructor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each(["estudiante", "instructor"] as Role[])(
    "impide que %s abra rutas de admin", async (role) => {
      session(role);
      const response = await visit("/admin/instructors");
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `http://localhost:3001/${role === "estudiante" ? "student" : "instructor"}`,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("impide al admin y al estudiante entrar al panel del instructor", async () => {
    session("admin");
    expect((await visit("/instructor")).headers.get("location")).toBe("http://localhost:3001/admin");
    session("estudiante");
    expect((await visit("/instructor")).headers.get("location")).toBe("http://localhost:3001/student");
  });

  it("envía al instructor con clave temporal a cambiarla y permite esa ruta", async () => {
    session("instructor");
    fetchMock.mockImplementation(async () => Response.json({ mustChangePassword: true }));
    expect((await visit("/instructor")).headers.get("location"))
      .toBe("http://localhost:3001/instructor/change-password");
    expect((await visit("/instructor/change-password")).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/instructores/account-status",
      expect.objectContaining({ headers: { Authorization: "Bearer test-token" } }),
    );
  });

  it("envía al instructor inactivo a una pantalla clara", async () => {
    session("instructor");
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    expect((await visit("/instructor")).headers.get("location"))
      .toBe("http://localhost:3001/account-inactive");
  });
});
