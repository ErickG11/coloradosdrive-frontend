import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EnrollmentAdminControls } from "@/components/student-enrollment/EnrollmentAdminControls";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { pendingEnrollment } from "@/tests/fixtures/studentCohort";
vi.mock("@/hooks/useFetch", () => ({
  useFetch: () => ({ data: { documentsEnabled: true }, refetch: vi.fn() }),
}));
vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn() } }));
const enrollment = {
  ...pendingEnrollment,
  documentos: [
    { tipo: "cedula" as const, estado: "pendiente" as const, fechaMarcado: null, marcadoPor: null },
    {
      tipo: "papeleta_votacion" as const,
      estado: "pendiente" as const,
      fechaMarcado: null,
      marcadoPor: null,
    },
  ],
};
beforeEach(() => vi.clearAllMocks());
it("documentos muestra nombres legibles y guarda con el estado anterior sin duplicar etiquetas", async () => {
  vi.mocked(api.post).mockResolvedValue({});
  const changed = vi.fn();
  render(
    <EnrollmentAdminControls studentId="student" enrollment={enrollment} onChanged={changed} />,
  );
  expect(screen.queryByText("cedula")).not.toBeInTheDocument();
  expect(screen.queryByText("papeleta_votacion")).not.toBeInTheDocument();
  const identity = within(
    screen.getByRole("group", { name: "Estado de Documento de identidad original" }),
  );
  expect(identity.getByRole("button", { name: "Pendiente" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  fireEvent.click(identity.getByRole("button", { name: "Entregado" }));
  await waitFor(() => expect(changed).toHaveBeenCalledOnce());
  expect(api.post).toHaveBeenCalledWith(expect.stringContaining("/documento"), {
    tipo: "cedula",
    estado: "entregado",
    anterior: "pendiente",
  });
  expect(identity.getByRole("button", { name: "Entregado" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("status")).toHaveTextContent("Cambio guardado.");
});
it("carga por fila y conserva el mensaje y código del servidor si falla", async () => {
  let reject!: (error: Error) => void;
  vi.mocked(api.post).mockImplementation(
    () =>
      new Promise<never>((_, failure) => {
        reject = failure;
      }),
  );
  render(<EnrollmentAdminControls studentId="student" enrollment={enrollment} />);
  const identity = within(
    screen.getByRole("group", { name: "Estado de Documento de identidad original" }),
  );
  fireEvent.click(identity.getByRole("button", { name: "Entregado" }));
  expect(identity.getByRole("button", { name: "No aplica" })).toBeDisabled();
  expect(
    within(screen.getByRole("group", { name: "Estado de Papeleta de votación" })).getByRole(
      "button",
      { name: "Entregado" },
    ),
  ).toBeEnabled();
  reject(
    new ApiError("El documento cambió; recarga la ficha.", 409, {
      code: "DOCUMENTO_VERSION_CONFLICTO",
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "DOCUMENTO_VERSION_CONFLICTO: El documento cambió; recarga la ficha.",
  );
  expect(identity.getByRole("button", { name: "Pendiente" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
