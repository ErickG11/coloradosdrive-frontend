import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { AttendanceCorrectionDialog } from "@/components/attendance/AttendanceCorrectionDialog";
import { api } from "@/lib/api/client";
vi.mock("@/lib/api/client", () => ({ api: { patch: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
describe("contrato compatible del diálogo compartido", () => {
  it.each(["/practice-slots/hour/attendance/correction", "/practice-slots/hour/attendance"])(
    "sin callback conserva PATCH y onSaved: %s",
    async (endpoint) => {
      const result = { id: "hour", attended: false };
      vi.mocked(api.patch).mockResolvedValue(result);
      const saved = vi.fn();
      const close = vi.fn();
      const user = userEvent.setup();
      render(
        <AttendanceCorrectionDialog
          current={true}
          next={false}
          endpoint={endpoint}
          onSaved={saved}
          onClose={close}
        />,
      );
      await user.type(
        screen.getByLabelText("Motivo de la corrección"),
        "  Verifiqué el registro original  ",
      );
      await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
      expect(api.patch).toHaveBeenCalledExactlyOnceWith(endpoint, {
        attended: false,
        motivo: "Verifiqué el registro original",
      });
      expect(saved).toHaveBeenCalledWith(result);
      expect(close).not.toHaveBeenCalled();
    },
  );
  it("el callback de bloque recibe el motivo una vez sin hacer un PATCH adicional", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn();
    const user = userEvent.setup();
    render(
      <AttendanceCorrectionDialog
        current={true}
        next={false}
        endpoint=""
        save={save}
        onSaved={vi.fn()}
        onClose={close}
      />,
    );
    await user.type(
      screen.getByLabelText("Motivo de la corrección"),
      "Verifiqué el registro original",
    );
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledExactlyOnceWith({
      attended: false,
      motivo: "Verifiqué el registro original",
    });
    expect(api.patch).not.toHaveBeenCalled();
  });
});
