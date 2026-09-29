import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPublicCourses } from "@/lib/api/publicCourses";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("getPublicCourses", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("llama a GET /public/courses sin adjuntar Authorization", async () => {
    const mockedFetch = vi.mocked(fetch);
    mockedFetch.mockResolvedValue(jsonResponse([{ id: "1", tipo: "A", nombre: "Motocicletas" }]));

    await getPublicCourses();

    expect(mockedFetch).toHaveBeenCalledWith("http://localhost:3000/public/courses", {
      next: { revalidate: 300 },
    });
  });

  it("devuelve los cursos cuando la respuesta es exitosa", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse([{ id: "1", tipo: "A", nombre: "Motocicletas", horasRequeridas: 40 }]),
    );

    const courses = await getPublicCourses();

    expect(courses).toEqual([{ id: "1", tipo: "A", nombre: "Motocicletas", horasRequeridas: 40 }]);
  });

  it("devuelve un arreglo vacío si el backend responde con error", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Error" }, 500));

    expect(await getPublicCourses()).toEqual([]);
  });

  it("devuelve un arreglo vacío si el fetch lanza una excepción (backend caído)", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network error"));

    expect(await getPublicCourses()).toEqual([]);
  });
});
