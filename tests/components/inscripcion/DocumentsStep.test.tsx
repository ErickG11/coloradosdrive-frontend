import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentsStep, documentFileError } from "@/components/inscripcion/DocumentsStep";
vi.mock("@/lib/api/solicitudes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/solicitudes")>()),
  uploadSolicitudDocument: vi.fn(),
}));
import { uploadSolicitudDocument } from "@/lib/api/solicitudes";
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(uploadSolicitudDocument).mockResolvedValue({
    id: "d",
    tipoDocumento: "cedula",
    estado: "recibido",
    uploadedAt: "2026-11-03",
  });
});
it("valida tipo y máximo de 5 MiB", () => {
  expect(
    documentFileError(new File(["x"], "a.exe", { type: "application/octet-stream" })),
  ).toContain("JPG");
  expect(
    documentFileError(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "a.pdf", { type: "application/pdf" }),
    ),
  ).toContain("5 MiB");
});
it("selecciona por botón y muestra nombre, tamaño y revisión; permite reemplazar", async () => {
  const notice = vi.fn();
  render(
    <DocumentsStep
      session={{ solicitudId: "s", token: "t" }}
      onFinish={vi.fn()}
      onNotice={notice}
    />,
  );
  const slot = screen.getByRole("region", { name: "Cédula" }),
    user = userEvent.setup();
  const input = within(slot).getByLabelText("Cédula");
  const click = vi.spyOn(input as HTMLInputElement, "click");
  await user.click(within(slot).getByRole("button", { name: "Seleccionar archivo" }));
  expect(click).toHaveBeenCalled();
  const file = new File(["pdf"], "cedula.pdf", { type: "application/pdf" });
  await user.upload(input, file);
  expect(await within(slot).findByText("Subido (en revisión)")).toBeInTheDocument();
  expect(within(slot).getByText("cedula.pdf")).toBeInTheDocument();
  expect(within(slot).getByText("3 bytes")).toBeInTheDocument();
  await user.upload(input, new File(["nuevo"], "mejor.pdf", { type: "application/pdf" }));
  expect(uploadSolicitudDocument).toHaveBeenCalledTimes(2);
  expect(within(slot).getByRole("button", { name: "Reemplazar archivo" })).toBeEnabled();
  expect(notice).toHaveBeenCalledWith("Documento recibido.");
});
it("acepta soltar archivos y bloquea finalizar durante la subida", async () => {
  let resolve!: (value: {
    id: string;
    tipoDocumento: "cedula";
    estado: string;
    uploadedAt: string;
  }) => void;
  vi.mocked(uploadSolicitudDocument).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  render(
    <DocumentsStep
      session={{ solicitudId: "s", token: "t" }}
      onFinish={vi.fn()}
      onNotice={vi.fn()}
    />,
  );
  const slot = screen.getByRole("region", { name: "Cédula" }),
    zone = within(slot).getByText("Arrastra y suelta tu archivo aquí").parentElement!;
  fireEvent.drop(zone, {
    dataTransfer: { files: [new File(["pdf"], "foto.pdf", { type: "application/pdf" })] },
  });
  expect(within(slot).getByText("Subiendo")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Revisar y enviar" })).toBeDisabled();
  resolve({ id: "d", tipoDocumento: "cedula", estado: "recibido", uploadedAt: "2026-11-03" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Revisar y enviar" })).toBeEnabled(),
  );
});
it.each([
  new File(["exe"], "a.exe", { type: "application/octet-stream" }),
  new File([new Uint8Array(5 * 1024 * 1024 + 1)], "grande.pdf", { type: "application/pdf" }),
])("muestra error asociado sin enviar archivo inválido $name", (file) => {
  render(
    <DocumentsStep
      session={{ solicitudId: "s", token: "t" }}
      onFinish={vi.fn()}
      onNotice={vi.fn()}
    />,
  );
  const slot = screen.getByRole("region", { name: "Cédula" }),
    zone = within(slot).getByText("Arrastra y suelta tu archivo aquí").parentElement!;
  fireEvent.drop(zone, { dataTransfer: { files: [file] } });
  expect(within(slot).getByRole("alert")).toBeInTheDocument();
  expect(within(slot).getByLabelText("Cédula")).toHaveAttribute("aria-invalid", "true");
  expect(uploadSolicitudDocument).not.toHaveBeenCalled();
});
it("muestra todos los estados y conserva el motivo de rechazo y la exención", () => {
  render(
    <DocumentsStep
      session={{ solicitudId: "s", token: "t" }}
      initialDocuments={[
        { tipo: "cedula", estado: "aprobado" },
        { tipo: "tipo_sangre", estado: "rechazado", motivoRechazo: "No se lee" },
        { tipo: "titulo_bachiller", estado: "recibido" },
      ]}
      onFinish={vi.fn()}
      onNotice={vi.fn()}
    />,
  );
  const approved = screen.getByRole("region", { name: "Cédula" });
  expect(within(approved).getByText("Aprobado")).toBeInTheDocument();
  expect(within(approved).getByLabelText("Cédula")).toBeDisabled();
  expect(screen.getByText("Rechazado")).toBeInTheDocument();
  expect(screen.getByText("Motivo: No se lee")).toBeInTheDocument();
  expect(screen.getByText("Subido (en revisión)")).toBeInTheDocument();
  expect(screen.getByText("Pendiente de entrega")).toBeInTheDocument();
  expect(screen.getByText("No se exige desde los 65 años cumplidos.")).toBeInTheDocument();
});
it("permite revisar antes de enviar aunque falten documentos y muestra el nombre de décimo", async () => {
  const finish = vi.fn();
  render(
    <DocumentsStep
      session={{ solicitudId: "s", token: "t" }}
      onFinish={finish}
      onNotice={vi.fn()}
    />,
  );
  expect(
    screen.getByLabelText("Título de bachiller o certificado de décimo", { selector: "input" }),
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Revisar y enviar" }));
  expect(finish).toHaveBeenCalledOnce();
});
