import { beforeEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("@/hooks/useFetch", () => ({ useFetch: () => ({ data: [] }) }));
vi.mock("@/lib/api/solicitudes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/solicitudes")>()),
  solicitudes: { decide: vi.fn(), reviewDocument: vi.fn() },
}));
import { solicitudes } from "@/lib/api/solicitudes";
import { SolicitudDetail } from "@/components/solicitudes-admin/SolicitudDetail";
import type { SolicitudAdmin } from "@/types/solicitud";
export const solicitud: SolicitudAdmin = {
  id: "s",
  courseId: "c",
  cedula: "1710034065",
  nombreCompleto: "Ana",
  correo: "ana@example.com",
  telefono: null,
  fechaNacimiento: "2010-01-01",
  estado: "pendiente_revision",
  motivoRechazo: null,
  createdAt: "2026-10-01",
  solicitadaAt: "2026-10-01",
  consentimiento: {
    version: "2026-10-v1",
    aceptadoAt: "2026-10-01",
    representanteNombre: "Representante",
    representanteCedula: "1710034065",
    representanteAcepta: true,
  },
  documentos: [],
};
beforeEach(() => {
  vi.clearAllMocks();
});
it("muestra datos, consentimiento, representante y checklist en el drawer", () => {
  render(<SolicitudDetail solicitud={solicitud} onClose={vi.fn()} onDone={vi.fn()} />);
  expect(screen.getByRole("dialog")).toHaveAccessibleName("Solicitud de Ana");
  expect(screen.getByText("Versión: 2026-10-v1")).toBeInTheDocument();
  expect(screen.getByText("Representante: Representante")).toBeInTheDocument();
  expect(screen.getAllByText("Faltante")).toHaveLength(4);
});
it.each(["faltante", "recibido", "aprobado", "rechazado"])(
  "acciones de documento en estado %s",
  (estado) => {
    render(
      <SolicitudDetail
        solicitud={{
          ...solicitud,
          documentos: [
            {
              tipoDocumento: "cedula",
              estado,
              documentoId: estado === "faltante" ? null : "d",
              motivoRechazo: estado === "rechazado" ? "Foto borrosa" : null,
            },
          ],
        }}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    const card = screen.getByRole("heading", { name: "Cédula" }).parentElement!;
    expect(within(card).queryByRole("button", { name: "Ver" }) !== null).toBe(
      estado !== "faltante",
    );
    expect(within(card).queryByRole("button", { name: "Aprobar documento" }) !== null).toBe(
      estado === "recibido",
    );
    expect(within(card).queryByRole("button", { name: "Rechazar documento" }) !== null).toBe(
      estado === "recibido",
    );
    if (estado === "rechazado")
      expect(within(card).getByText("Motivo: Foto borrosa")).toBeInTheDocument();
  },
);
function Workspace() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir solicitud</button>
      {open ? (
        <SolicitudDetail solicitud={solicitud} onClose={() => setOpen(false)} onDone={vi.fn()} />
      ) : null}
    </>
  );
}
it.each(["Escape", "capa", "botón"])(
  "cierra con %s, restaura foco y desbloquea fondo",
  async (method) => {
    render(<Workspace />);
    const user = userEvent.setup(),
      opener = screen.getByRole("button", { name: "Abrir solicitud" });
    await user.click(opener);
    expect(screen.getByRole("dialog")).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    if (method === "Escape") await user.keyboard("{Escape}");
    else if (method === "capa") fireEvent.pointerDown(screen.getByTestId("solicitud-scrim"));
    else await user.click(screen.getByRole("button", { name: "Cerrar solicitud" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).not.toBe("hidden");
  },
);
it("atrapa el foco dentro del panel en ambas direcciones", async () => {
  render(<Workspace />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Abrir solicitud" }));
  const dialog = screen.getByRole("dialog"),
    close = within(dialog).getByRole("button", { name: "Cerrar solicitud" }),
    last = within(dialog).getByRole("button", { name: "Eliminar solicitud" });
  await user.tab();
  expect(close).toHaveFocus();
  await user.tab({ shift: true });
  expect(last).toHaveFocus();
  await user.tab();
  expect(close).toHaveFocus();
});
it("rechaza un documento inline con motivo y retira sus acciones inmediatamente", async () => {
  vi.mocked(solicitudes.reviewDocument).mockResolvedValue({});
  render(
    <SolicitudDetail
      solicitud={{
        ...solicitud,
        documentos: [
          { tipoDocumento: "cedula", estado: "recibido", documentoId: "d", motivoRechazo: null },
        ],
      }}
      onClose={vi.fn()}
      onDone={vi.fn()}
    />,
  );
  const user = userEvent.setup(),
    card = screen.getByRole("region", { name: "Cédula" });
  await user.click(within(card).getByRole("button", { name: "Rechazar documento" }));
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  expect(within(card).getByLabelText("Motivo del rechazo")).toHaveFocus();
  await user.click(within(card).getByRole("button", { name: "Confirmar rechazo" }));
  expect(solicitudes.reviewDocument).not.toHaveBeenCalled();
  await user.type(within(card).getByLabelText("Motivo del rechazo"), "Foto borrosa");
  await user.click(within(card).getByRole("button", { name: "Cancelar" }));
  expect(within(card).queryByLabelText("Motivo del rechazo")).not.toBeInTheDocument();
  await user.click(within(card).getByRole("button", { name: "Rechazar documento" }));
  await user.click(within(card).getByRole("button", { name: "Confirmar rechazo" }));
  expect(await within(card).findByText("Motivo: Foto borrosa")).toBeInTheDocument();
  expect(within(card).queryByRole("button", { name: "Aprobar documento" })).not.toBeInTheDocument();
});
it.each(["aprobada", "rechazada"])(
  "conserva el resultado %s en el panel y lo deja en solo lectura",
  async (estado) => {
    vi.mocked(solicitudes.decide).mockResolvedValue({
      id: "s",
      estado,
      studentId: estado === "aprobada" ? "u" : null,
      correoEnviado: true,
      cohorteAsignada: { cohortId: null, estado: "pendiente_cohorte" },
    });
    render(<SolicitudDetail solicitud={solicitud} onClose={vi.fn()} onDone={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", {
        name: estado === "aprobada" ? "Aprobar solicitud" : "Rechazar solicitud",
      }),
    );
    if (estado === "rechazada")
      await user.type(screen.getByLabelText("Motivo del rechazo"), "Datos incompletos");
    await user.click(
      screen.getByRole("button", {
        name: estado === "aprobada" ? "Confirmar aprobación" : "Confirmar rechazo",
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /^(Aprobar|Rechazar) solicitud/ }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Correo enviado correctamente.")).toBeInTheDocument();
    if (estado === "aprobada") expect(screen.getByText(/Pendiente de cohorte/)).toBeInTheDocument();
  },
);
it.each(["aprobada", "rechazada"])(
  "solicitud %s bloquea solo su decisión y respeta la revisión documental",
  (estado) => {
    render(
      <SolicitudDetail
        solicitud={{
          ...solicitud,
          estado,
          documentos: [
            { tipoDocumento: "cedula", estado: "recibido", documentoId: "d", motivoRechazo: null },
          ],
        }}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Ver" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^(Aprobar|Rechazar) solicitud/ }),
    ).not.toBeInTheDocument();
    expect(Boolean(screen.queryByRole("button", { name: "Aprobar documento" }))).toBe(
      estado === "aprobada",
    );
    expect(Boolean(screen.queryByRole("button", { name: "Eliminar solicitud" }))).toBe(
      estado === "rechazada",
    );
  },
);
