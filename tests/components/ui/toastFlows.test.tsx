import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InstructorForm } from "@/app/(admin)/admin/instructors/InstructorForm";
import ChangePasswordPage from "@/app/(student)/student/change-password/page";
import { DeleteSolicitud } from "@/components/solicitudes-admin/DeleteSolicitud";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { eliminarSolicitud } from "@/lib/api/inscripcion";
import { renderWithToast, toastTexts } from "@/tests/helpers/renderWithToast";

// CD-274: cada crear/actualizar/eliminar exitoso muestra el aviso verde global,
// y un rechazo del servidor no lo muestra. Un flujo por módulo.
vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn(), patch: vi.fn() } }));
vi.mock("@/lib/api/inscripcion", async (original) => ({
  ...(await original<typeof import("@/lib/api/inscripcion")>()),
  eliminarSolicitud: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: vi.fn().mockResolvedValue({ error: null }) } }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

function fillInstructor() {
  fireEvent.change(screen.getByLabelText("Cédula"), { target: { value: "1710034065" } });
  fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Bruno Salas" } });
  fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "0991234567" } });
  fireEvent.change(screen.getByLabelText("Correo electrónico"), {
    target: { value: "bruno@example.com" },
  });
}

describe("aviso verde global por módulo", () => {
  beforeEach(() => vi.resetAllMocks());

  it("instructores: crear un instructor avisa «Instructor creado.»", async () => {
    vi.mocked(api.post).mockResolvedValue({});
    const onSaved = vi.fn();
    renderWithToast(<InstructorForm onSaved={onSaved} onCancel={vi.fn()} />);
    fillInstructor();
    await userEvent.setup().click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(toastTexts()).toEqual(["Instructor creado."]);
  });

  it("instructores: si el servidor rechaza, no hay aviso verde", async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError("El correo ya está registrado", 409));
    const onSaved = vi.fn();
    renderWithToast(<InstructorForm onSaved={onSaved} onCancel={vi.fn()} />);
    fillInstructor();
    await userEvent.setup().click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled());
    expect(onSaved).not.toHaveBeenCalled();
    expect(toastTexts()).toEqual([]);
  });

  it("solicitudes: eliminar una solicitud avisa «Solicitud eliminada.»", async () => {
    vi.mocked(eliminarSolicitud).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithToast(<DeleteSolicitud id="s" cedula="1710034065" onDeleted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Eliminar solicitud" }));
    await user.type(screen.getByLabelText("Escribe la cédula para confirmar"), "1710034065");
    await user.click(screen.getByRole("button", { name: "Eliminar definitivamente" }));

    await waitFor(() => expect(toastTexts()).toEqual(["Solicitud eliminada."]));
  });

  it("contraseñas: cambiar la contraseña avisa «Contraseña actualizada.»", async () => {
    vi.mocked(api.post).mockResolvedValue({});
    const user = userEvent.setup();
    renderWithToast(
      <ThemeProvider>
        <ChangePasswordPage />
      </ThemeProvider>,
    );
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
      target: { value: "new-local-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar nueva contraseña"), {
      target: { value: "new-local-password" },
    });
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    await waitFor(() => expect(toastTexts()).toEqual(["Contraseña actualizada."]));
  });
});
