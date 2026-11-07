import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("quita la barra final de NEXT_PUBLIC_API_URL para no duplicarla al concatenar rutas", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.invalid//");
  vi.resetModules();
  const { env } = await import("@/lib/utils/env");
  expect(env.NEXT_PUBLIC_API_URL).toBe("https://api.example.invalid");
});

it("conserva una URL sin barra final", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.invalid");
  vi.resetModules();
  const { env } = await import("@/lib/utils/env");
  expect(env.NEXT_PUBLIC_API_URL).toBe("https://api.example.invalid");
});
