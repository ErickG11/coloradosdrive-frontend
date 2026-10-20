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

  it.each([
    ["admin", "/admin"],
    ["estudiante", "/student"],
    ["instructor", "/instructor"],
  ] as [Role, string][])("redirige /login con sesión de %s a su home", async (role, home) => {
    session(role);
    const response = await visit("/login");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`http://localhost:3001${home}`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("muestra el formulario en /login sin sesión", async () => {
    mockedUpdateSession.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      user: null,
      accessToken: undefined,
    } as unknown as Awaited<ReturnType<typeof updateSession>>);
    const response = await visit("/login");
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("muestra el formulario en /login si la sesión no tiene rol (sin bucle con /)", async () => {
    mockedUpdateSession.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      user: { app_metadata: {} },
      accessToken: "test-token",
    } as unknown as Awaited<ReturnType<typeof updateSession>>);
    const response = await visit("/login");
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("no hay bucle: de /login el estudiante con clave temporal termina en change-password", async () => {
    session("estudiante");
    fetchMock.mockImplementation(async () => Response.json({ mustChangePassword: true }));
    const first = await visit("/login");
    expect(first.headers.get("location")).toBe("http://localhost:3001/student");
    const second = await visit("/student");
    expect(second.headers.get("location")).toBe("http://localhost:3001/student/change-password");
    expect((await visit("/student/change-password")).status).toBe(200);
  });

  it("envía al estudiante desactivado con JWT vigente a /account-inactive, también desde /login", async () => {
    session("estudiante");
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    expect((await visit("/login")).headers.get("location")).toBe("http://localhost:3001/student");
    expect((await visit("/student")).headers.get("location")).toBe(
      "http://localhost:3001/account-inactive",
    );
    expect((await visit("/account-inactive")).status).toBe(200);
  });

  it("no hay bucle: de /login el instructor inactivo termina en /account-inactive", async () => {
    session("instructor");
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    expect((await visit("/login")).headers.get("location")).toBe("http://localhost:3001/instructor");
    expect((await visit("/instructor")).headers.get("location")).toBe(
      "http://localhost:3001/account-inactive",
    );
    expect((await visit("/account-inactive")).status).toBe(200);
  });
});
