import { act, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StudentActions } from "@/app/(admin)/admin/students/StudentActions";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { studentProfile } from "@/tests/fixtures/studentProfile";
vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn() } }));
const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => nav }));
const onChanged = vi.fn(),
  onPending = vi.fn(),
  onReload = vi.fn(),
  onBusyChange = vi.fn();
function show(active = true, pending = false) {
  render(
    <StudentActions
      student={{ ...studentProfile, activo: active }}
      disabled={false}
      deletionPending={pending}
      onChanged={onChanged}
      onPending={onPending}
      onReload={onReload}
      onBusyChange={onBusyChange}
    />,
  );
}
function deletion() {
  fireEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente" }));
  const dialog = within(screen.getByRole("dialog"));
  return {
    dialog,
    input: dialog.getByLabelText("Para confirmar, escribe la cédula del alumno:"),
    submit: dialog.getByRole("button", { name: "Eliminar definitivamente" }),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.post).mockReset();
});
describe("acciones en ficha", () => {
  it("diálogo aprobado, cédula exacta solo en memoria y autocomplete desactivado", () => {
    show();
    const { dialog, input, submit } = deletion();
    expect(
      dialog.getByText("Esta acción no se puede deshacer. Se eliminarán:"),
    ).toBeInTheDocument();
    expect(dialog.getAllByRole("listitem")).toHaveLength(5);
    expect(dialog.getByText(/es reversible/)).toBeInTheDocument();
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(submit).toBeDisabled();
    for (const value of ["010000000", studentProfile.cedula + " ", " " + studentProfile.cedula]) {
      fireEvent.change(input, { target: { value } });
      expect(submit).toBeDisabled();
    }
    fireEvent.change(input, { target: { value: studentProfile.cedula } });
    expect(submit).toBeEnabled();
    fireEvent.click(dialog.getByRole("button", { name: "Cancelar" }));
    expect(api.post).not.toHaveBeenCalled();
    expect(nav.replace).not.toHaveBeenCalled();
  });
  it("envía confirmación una vez, bloquea cierre mientras envía y redirige con aviso sin PII", async () => {
    let resolve!: (v: unknown) => void;
    vi.mocked(api.post).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    show();
    const { dialog, input, submit } = deletion();
    fireEvent.change(input, { target: { value: studentProfile.cedula } });
    fireEvent.click(submit);
    fireEvent.click(submit);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(dialog.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith(`/admin/estudiantes/${studentProfile.id}/eliminar`, {
      confirmacionCedula: studentProfile.cedula,
    });
    await act(async () => resolve({ status: "completo" }));
    expect(nav.replace).toHaveBeenCalledWith("/admin/students?aviso=alumno-eliminado");
    expect(JSON.stringify(nav.replace.mock.calls)).not.toContain(studentProfile.cedula);
  });
  it.each(["UNCONFIRMED", "DELETION_INCOMPLETE", "CD030"])(
    "%s no reenvía borrado y ofrece consultar eliminaciones",
    async (code) => {
      vi.mocked(api.post).mockRejectedValue(new ApiError("rechazo", 503, { code }));
      show();
      const { input, submit } = deletion();
      fireEvent.change(input, { target: { value: studentProfile.cedula } });
      fireEvent.click(submit);
      await waitFor(() => expect(onPending).toHaveBeenCalled());
      expect(api.post).toHaveBeenCalledTimes(1);
      expect(
        screen.getByRole("link", { name: "Consultar eliminaciones pendientes" }),
      ).toHaveAttribute("href", "/admin/students/deletions");
      expect(
        screen.queryByLabelText("Para confirmar, escribe la cédula del alumno:"),
      ).not.toBeInTheDocument();
    },
  );
  it("INVALID_CONFIRMATION aparece junto al campo sin revelar errores crudos", async () => {
    vi.mocked(api.post).mockRejectedValue(
      new ApiError("error", 400, { code: "INVALID_CONFIRMATION" }),
    );
    show();
    const { input, submit } = deletion();
    fireEvent.change(input, { target: { value: studentProfile.cedula } });
    fireEvent.click(submit);
    await waitFor(() => expect(input).toHaveAttribute("aria-invalid", "true"));
    expect(nav.replace).not.toHaveBeenCalled();
    expect(onPending).not.toHaveBeenCalled();
  });
  it.each([true, false])("muestra acceso y confirma cambio desde activo=%s", async (active) => {
    vi.mocked(api.post).mockResolvedValue({
      activo: !active,
      reservas: [{ status: "pendiente_reprogramar" }],
      recuperacionPendiente: false,
    });
    show(active);
    expect(screen.getByText(active ? "Activo" : "Inactivo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: active ? "Desactivar" : "Reactivar" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: active ? "Desactivar" : "Reactivar",
      }),
    );
    await waitFor(() =>
      expect(onChanged).toHaveBeenCalledWith(
        expect.stringContaining(active ? "Acceso desactivado" : "Acceso reactivado"),
      ),
    );
    if (!active)
      expect(onChanged).toHaveBeenCalledWith(expect.stringContaining("pendientes de reprogramar"));
  });
  it("una recuperación incierta no se presenta como fallo de acceso", async () => {
    vi.mocked(api.post).mockResolvedValue({
      activo: true,
      reservas: [],
      recuperacionPendiente: true,
    });
    show(false);
    fireEvent.click(screen.getByRole("button", { name: "Reactivar" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reactivar" }));
    await waitFor(() =>
      expect(onChanged).toHaveBeenCalledWith(expect.stringContaining("Acceso reactivado")),
    );
  });
  it("eliminación conocida bloquea nuevas acciones y ofrece enlace", () => {
    show(false, true);
    expect(screen.getByRole("button", { name: "Reactivar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Eliminar definitivamente" })).toBeDisabled();
  });
});
