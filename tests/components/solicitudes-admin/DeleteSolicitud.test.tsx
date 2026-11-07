import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("@/lib/api/inscripcion", async (original) => ({
  ...(await original<typeof import("@/lib/api/inscripcion")>()),
  eliminarSolicitud: vi.fn(),
}));
import { eliminarSolicitud } from "@/lib/api/inscripcion";
import { DeleteSolicitud } from "@/components/solicitudes-admin/DeleteSolicitud";
it("exige escribir la cédula y permite cancelar antes de eliminar", async () => {
  vi.mocked(eliminarSolicitud).mockResolvedValue(undefined);
  const done = vi.fn();
  render(<DeleteSolicitud id="s" cedula="1710034065" onDeleted={done} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Eliminar solicitud" }));
  expect(screen.getByRole("button", { name: "Eliminar definitivamente" })).toBeDisabled();
  expect(screen.getByLabelText("Escribe la cédula para confirmar")).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Cancelar eliminación" }));
  expect(eliminarSolicitud).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Eliminar solicitud" }));
  await user.type(screen.getByLabelText("Escribe la cédula para confirmar"), "1710034065");
  await user.click(screen.getByRole("button", { name: "Eliminar definitivamente" }));
  expect(eliminarSolicitud).toHaveBeenCalledWith("s");
  expect(done).toHaveBeenCalledOnce();
});
