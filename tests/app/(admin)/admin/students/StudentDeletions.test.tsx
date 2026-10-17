import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import StudentDeletionsList from "@/app/(admin)/admin/students/deletions/page";
import StudentsList from "@/app/(admin)/admin/students/page";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
vi.mock("@/hooks/useFetch", () => ({ useFetch: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn() } }));
const nav = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => nav.params,
}));
const id = "22222222-2222-4222-8222-222222222222",
  refetch = vi.fn();
const operation = {
  student_id: id,
  status: "fallido",
  phase: "auth",
  retry_count: 2,
  updated_at: "2026-10-15T16:00:00Z",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.post).mockReset();
  nav.params = new URLSearchParams();
});
afterEach(() => vi.unstubAllGlobals());
function show(state: Record<string, unknown> = {}) {
  vi.mocked(useFetch).mockReturnValue({
    data: { items: [operation], total: 41 },
    error: null,
    isLoading: false,
    refetch,
    ...state,
  });
  render(<StudentDeletionsList />);
}
describe("eliminaciones sin perfil", () => {
  it("consulta GET estático, muestra UUID/fase/estado y permite copiar", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    show();
    expect(useFetch).toHaveBeenCalledWith("/admin/estudiantes/eliminaciones?page=1&pageSize=20");
    expect(screen.getByText("Fallida")).toBeInTheDocument();
    expect(screen.getByText("Cuenta de acceso")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: `Copiar UUID ${id}` }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(id));
    expect(screen.getByRole("status")).toHaveTextContent("UUID copiado");
  });
  it("copia fallida conserva alternativa manual", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    show();
    fireEvent.click(screen.getByRole("button", { name: `Copiar UUID ${id}` }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("copiarlo manualmente"),
    );
    expect(screen.getByText(id)).toBeInTheDocument();
  });
  it("reanuda con {} una sola vez y redirige con aviso al completar", async () => {
    let resolve!: (v: unknown) => void;
    vi.mocked(api.post).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    show();
    const button = screen.getByRole("button", { name: `Reintentar eliminación ${id}` });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(api.post).toHaveBeenCalledOnce();
    expect(api.post).toHaveBeenCalledWith(`/admin/estudiantes/${id}/eliminar`, {});
    expect(button).toBeDisabled();
    await act(async () => resolve({ status: "completo" }));
    expect(nav.replace).toHaveBeenCalledWith("/admin/students?aviso=alumno-eliminado");
  });
  it.each(["DELETION_INCOMPLETE", "UNCONFIRMED", "CD030"])(
    "%s refresca la consulta sin reenvío automático",
    async (code) => {
      vi.mocked(api.post).mockRejectedValue(new ApiError("rechazo", 503, { code }));
      show();
      fireEvent.click(screen.getByRole("button", { name: `Reintentar eliminación ${id}` }));
      await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
      expect(api.post).toHaveBeenCalledOnce();
      expect(screen.getByRole("alert")).toBeInTheDocument();
      if (code === "UNCONFIRMED")
        expect(screen.getByRole("alert")).toHaveTextContent("en esta lista");
    },
  );
  it("cambio de estado vuelve a página 1 y paginación mantiene estado", () => {
    nav.params = new URLSearchParams("page=2&estado=fallido");
    show();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(nav.replace).toHaveBeenLastCalledWith(
      "/admin/students/deletions?page=3&estado=fallido",
      { scroll: false },
    );
    fireEvent.change(screen.getByLabelText("Estado de eliminación"), {
      target: { value: "pendiente" },
    });
    expect(nav.replace).toHaveBeenLastCalledWith(
      "/admin/students/deletions?page=1&estado=pendiente",
      { scroll: false },
    );
  });
  it.each(["carga", "vacío", "error"])("estado %s", (kind) => {
    show(
      kind === "carga"
        ? { isLoading: true }
        : kind === "vacío"
          ? { data: { items: [], total: 0 } }
          : { data: null, error: "No se pudo conectar", errorStatus: 503 },
    );
    if (kind === "carga")
      expect(screen.getByRole("status")).toHaveTextContent("Cargando eliminaciones");
    if (kind === "vacío")
      expect(screen.getByText("No hay eliminaciones pendientes o fallidas.")).toBeInTheDocument();
    if (kind === "error") {
      expect(screen.getByRole("alert")).toHaveTextContent("No se pudo conectar");
      fireEvent.click(screen.getByRole("button", { name: "Reintentar consulta" }));
      expect(refetch).toHaveBeenCalledOnce();
    }
  });
  it("el listado de alumnos muestra aviso fijo de éxito y entrada a eliminaciones", () => {
    nav.params = new URLSearchParams("aviso=alumno-eliminado");
    vi.mocked(useFetch).mockImplementation(((path: string) => ({
      data: path === "/courses" || path === "/cohorts" ? [] : { items: [], total: 0 },
      error: null,
      isLoading: false,
      refetch,
    })) as typeof useFetch);
    render(<StudentsList />);
    expect(screen.getByRole("status")).toHaveTextContent("El alumno se eliminó definitivamente.");
    expect(screen.getByRole("link", { name: "Eliminaciones pendientes" })).toHaveAttribute(
      "href",
      "/admin/students/deletions",
    );
  });
});
