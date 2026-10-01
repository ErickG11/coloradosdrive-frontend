import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InstructorsPage from "@/app/(admin)/admin/instructors/page";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { InstructorDetail, InstructorList } from "@/types";

vi.mock("@/hooks/useFetch", () => ({ useFetch: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

const mockedUseFetch = vi.mocked(useFetch);
const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);
const refetch = vi.fn();
const instructor: InstructorDetail = {
  id: "6e73ec86-d8e1-4ebe-9b10-d1f2712ade44", cedula: "1710034065",
  nombreCompleto: "Bruno Salas", telefono: "0991234567", correo: "bruno@example.com",
  activo: true, createdAt: "2026-03-01T00:00:00Z",
};
const list: InstructorList = { items: [instructor], total: 1, page: 1, pageSize: 10 };

describe("InstructorsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseFetch.mockReturnValue({ data: list, isLoading: false, error: null, refetch });
  });

  it("lista, busca y filtra con los parámetros del backend", async () => {
    const user = userEvent.setup();
    render(<InstructorsPage />);
    expect(screen.getByText("Bruno Salas")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Buscar por nombre o cédula"), "Bruno");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await user.selectOptions(screen.getByLabelText("Estado"), "false");
    expect(mockedUseFetch).toHaveBeenLastCalledWith(
      "/admin/instructores?page=1&pageSize=10&q=Bruno&activo=false",
    );
  });

  it("pide confirmación y muestra el 409 al desactivar", async () => {
    const user = userEvent.setup();
    mockedGet.mockResolvedValue(instructor);
    mockedPost.mockRejectedValue(new ApiError("El instructor tiene franjas futuras asignadas o confirmadas", 409));
    render(<InstructorsPage />);
    await user.click(screen.getByRole("button", { name: "Ver y gestionar" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Instructor" }))
      .getByRole("button", { name: "Desactivar" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Confirmar acción" }))
      .getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(
      "El instructor tiene franjas futuras asignadas o confirmadas",
    ));
    expect(mockedPost).toHaveBeenCalledWith(
      `/admin/instructores/${instructor.id}/desactivar`,
    );
  });

  it("confirma el restablecimiento de un instructor activo y muestra el éxito sin clave", async () => {
    const user = userEvent.setup();
    mockedGet.mockResolvedValue(instructor);
    mockedPost.mockResolvedValue(undefined);
    render(<InstructorsPage />);

    await user.click(screen.getByRole("button", { name: "Ver y gestionar" }));
    const detail = within(await screen.findByRole("dialog", { name: "Instructor" }));
    expect(detail.queryByRole("button", { name: "Reenviar credenciales" })).not.toBeInTheDocument();
    await user.click(detail.getByRole("button", { name: "Restablecer contraseña" }));
    const confirmation = await screen.findByRole("dialog", { name: "Confirmar acción" });
    expect(within(confirmation).getByText(
      "Se enviará una contraseña temporal al correo del instructor y deberá cambiarla al entrar",
    )).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();

    await user.click(within(confirmation).getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(mockedPost).toHaveBeenCalledWith(
      `/admin/instructores/${instructor.id}/restablecer-password`,
    ));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Se envió una contraseña temporal al correo del instructor.",
    );
    expect(screen.queryByText(/contraseña:\s*\S+/i)).not.toBeInTheDocument();
  });

  it("oculta el restablecimiento para instructores inactivos", async () => {
    const user = userEvent.setup();
    mockedGet.mockResolvedValue({ ...instructor, activo: false });
    render(<InstructorsPage />);

    await user.click(screen.getByRole("button", { name: "Ver y gestionar" }));
    const detail = within(await screen.findByRole("dialog", { name: "Instructor" }));
    expect(detail.queryByRole("button", { name: "Restablecer contraseña" })).not.toBeInTheDocument();
    expect(detail.queryByRole("button", { name: "Reenviar credenciales" })).not.toBeInTheDocument();
  });

  it("muestra el error del backend al restablecer", async () => {
    const user = userEvent.setup();
    mockedGet.mockResolvedValue(instructor);
    mockedPost.mockRejectedValue(new ApiError("No se pudo enviar el correo de restablecimiento", 502));
    render(<InstructorsPage />);

    await user.click(screen.getByRole("button", { name: "Ver y gestionar" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Instructor" }))
      .getByRole("button", { name: "Restablecer contraseña" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Confirmar acción" }))
      .getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo enviar el correo de restablecimiento",
    );
  });
});
