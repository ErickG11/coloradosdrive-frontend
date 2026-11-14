import { useState } from "react";
import { expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidePanel } from "@/components/ui/SidePanel";
import { Modal } from "@/components/ui/Modal";
function Example() {
  const [open, setOpen] = useState(false),
    [confirm, setConfirm] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir ficha</button>
      {open ? (
        <SidePanel title="Ficha" onClose={() => setOpen(false)} footer={<button>Guardar</button>}>
          <button onClick={() => setConfirm(true)}>Confirmación</button>
          <Modal isOpen={confirm} title="Confirmar" onClose={() => setConfirm(false)}>
            <button>Aceptar</button>
          </Modal>
        </SidePanel>
      ) : null}
    </>
  );
}
it("Escape cierra solo la confirmación superior y restaura el foco al cerrar el panel", async () => {
  const user = userEvent.setup();
  render(<Example />);
  const opener = screen.getByRole("button", { name: "Abrir ficha" });
  await user.click(opener);
  expect(screen.getByRole("complementary", { name: "Ficha" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Confirmación" }));
  await user.keyboard("{Escape}");
  expect(screen.getByRole("complementary", { name: "Ficha" })).toBeInTheDocument();
  // El diálogo de confirmación termina su salida animada antes de que el panel reciba Escape.
  await waitFor(() => expect(document.querySelector('[aria-modal="true"]')).toBeNull());
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("complementary", { name: "Ficha" })).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});
