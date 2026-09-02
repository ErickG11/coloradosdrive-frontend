import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

import { api, apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/client";

const mockedCreateClient = vi.mocked(createClient);

function mockSession(accessToken: string | null) {
  const getSession = vi.fn().mockResolvedValue({
    data: { session: accessToken ? { access_token: accessToken } : null },
  });
  mockedCreateClient.mockReturnValue({
    auth: { getSession },
  } as unknown as ReturnType<typeof createClient>);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetch / api client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockSession("test-access-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("arma la URL desde NEXT_PUBLIC_API_URL y adjunta el JWT de la sesión activa", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(jsonResponse({ status: "ok" }));

    await apiFetch("/health");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/health",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-access-token" }),
      }),
    );
  });

  it("no adjunta Authorization si no hay sesión activa", async () => {
    mockSession(null);
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(jsonResponse({ status: "ok" }));

    await apiFetch("/health");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("devuelve el body parseado como JSON en una respuesta exitosa", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(jsonResponse({ status: "ok", uptimeSeconds: 12 }));

    const result = await apiFetch<{ status: string; uptimeSeconds: number }>("/health");

    expect(result).toEqual({ status: "ok", uptimeSeconds: 12 });
  });

  it("lanza ApiError con el mensaje del backend cuando la respuesta no es ok", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(jsonResponse({ status: "error", message: "No autorizado" }, 401));

    await expect(apiFetch("/admin/cursos")).rejects.toMatchObject({
      message: "No autorizado",
      status: 401,
    });
    await expect(apiFetch("/admin/cursos")).rejects.toBeInstanceOf(ApiError);
  });

  it("usa un mensaje por defecto según el status cuando la respuesta no trae body JSON", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response("not json", { status: 500, headers: { "Content-Type": "text/plain" } }),
    );

    await expect(apiFetch("/health")).rejects.toMatchObject({
      message: "Error interno del servidor. Intenta de nuevo más tarde.",
      status: 500,
    });
  });

  it("api.post envía method POST y el body serializado", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(jsonResponse({ id: "1" }, 201));

    await api.post("/cursos", { nombre: "Curso A" });

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify({ nombre: "Curso A" }));
  });

  it("devuelve undefined en una respuesta 204", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await api.delete("/cursos/1");

    expect(result).toBeUndefined();
  });
});
