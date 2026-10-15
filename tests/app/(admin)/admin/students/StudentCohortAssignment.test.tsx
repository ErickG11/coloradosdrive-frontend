import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentCohortAssignment } from "@/app/(admin)/admin/students/StudentCohortAssignment";
import { StudentDetail, StudentProfile } from "@/app/(admin)/admin/students/StudentDetail";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { studentProfile } from "@/tests/fixtures/studentProfile";
import { cohortOptions, pendingEnrollment } from "@/tests/fixtures/studentCohort";
vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}));
const callbacks = {
  onClose: vi.fn(),
  onSaved: vi.fn(),
  onReload: vi.fn(),
  onDeletionPending: vi.fn(),
};
function show(enrollment = pendingEnrollment) {
  return render(
    <StudentCohortAssignment
      studentId={studentProfile.id}
      enrollment={enrollment}
      {...callbacks}
    />,
  );
}
const confirm = () => screen.getByRole("button", { name: "Confirmar asignación" });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockReset().mockResolvedValue(cohortOptions);
  vi.mocked(api.post).mockReset().mockResolvedValue({ status: "activo" });
});
describe("modal C", () => {
  it("consulta al abrir y muestra sugerencia, ventana inclusiva, cupos e importes", async () => {
    show();
    expect(screen.getByText("Cargando cohortes…")).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
    const select = await screen.findByLabelText("Cohorte");
    expect(api.get).toHaveBeenCalledExactlyOnceWith(
      `/admin/estudiantes/${studentProfile.id}/matriculas/${pendingEnrollment.enrollmentId}/cohortes`,
    );
    expect(select).toHaveValue(cohortOptions.items[0].id);
    expect(screen.getByText(/Sugerencia: Cohorte ficticia/)).toBeInTheDocument();
    expect(screen.getByText(/está por cerrar/)).toBeInTheDocument();
    expect(
      screen.getByText(/Ventana de matrícula: 01\/10\/2026 al 31\/10\/2026/),
    ).toBeInTheDocument();
    expect(screen.getByText("Cupos disponibles: 1")).toBeInTheDocument();
    expect(screen.getByText("Neto").nextElementSibling?.textContent).toContain("100");
    expect(screen.getByText("Abono").nextElementSibling?.textContent).toContain("25");
    expect(screen.getByText("Saldo").nextElementSibling?.textContent).toContain("75");
    fireEvent.change(select, { target: { value: cohortOptions.items[1].id } });
    expect(screen.getByText("Neto").nextElementSibling?.textContent).toContain("50");
    expect(screen.getByText("Saldo").nextElementSibling?.textContent).toContain("25");
  });
  it("no envía sin selección y valida abono <= neto incluyendo igualdad", async () => {
    show({ ...pendingEnrollment, montoAbonado: 100 });
    const select = await screen.findByLabelText("Cohorte");
    expect(confirm()).toBeEnabled();
    fireEvent.change(select, { target: { value: cohortOptions.items[1].id } });
    expect(screen.getByRole("alert")).toHaveTextContent(/abono supera/);
    expect(confirm()).toBeDisabled();
    fireEvent.click(confirm());
    fireEvent.change(select, { target: { value: "" } });
    expect(confirm()).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
  });
  it("bloquea doble envío y Escape/cancelar durante POST", async () => {
    let resolve!: (data: unknown) => void;
    vi.mocked(api.post).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    show();
    await screen.findByLabelText("Cohorte");
    const button = confirm();
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(callbacks.onClose).not.toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      `/admin/estudiantes/${studentProfile.id}/matriculas/${pendingEnrollment.enrollmentId}/asignar-cohorte`,
      { cohortId: cohortOptions.items[0].id },
    );
    await act(async () => resolve({ status: "activo" }));
    expect(callbacks.onSaved).toHaveBeenCalledOnce();
  });
  it("sin opciones muestra mensaje y actualiza solo por botón", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      ...cohortOptions,
      items: [],
      suggestion: { cohortId: null },
    });
    show();
    await screen.findByText(/No hay cohortes/);
    expect(confirm()).toBeDisabled();
    expect(api.get).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Actualizar opciones" }));
    await screen.findByLabelText("Cohorte");
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.post).not.toHaveBeenCalled();
  });
  it("error de lectura conserva mensaje y ofrece actualizar", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new ApiError("No tienes permiso para consultar", 403));
    show();
    await screen.findByText("No tienes permiso para consultar");
    expect(confirm()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Actualizar opciones" }));
    await screen.findByLabelText("Cohorte");
    expect(api.get).toHaveBeenCalledTimes(2);
  });
  it("COHORT_CHANGED reconsulta una vez y exige elegir/confirmar de nuevo", async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiError("proveedor", 409, { code: "COHORT_CHANGED" }),
    );
    show();
    await screen.findByLabelText("Cohorte");
    fireEvent.click(confirm());
    await screen.findByText(/La cohorte o el día cambiaron/);
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    const select = await screen.findByLabelText("Cohorte");
    expect(select).toHaveValue("");
    expect(confirm()).toBeDisabled();
    expect(api.post).toHaveBeenCalledTimes(1);
    fireEvent.change(select, { target: { value: cohortOptions.items[1].id } });
    fireEvent.click(confirm());
    await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledOnce());
    expect(api.post).toHaveBeenCalledTimes(2);
  });
  it.each([
    "COHORT_FULL",
    "COHORT_WINDOW_CLOSED",
    "ABONO_EXCEEDS_NET",
    "COHORT_COURSE_MISMATCH",
    "ENROLLMENT_NOT_PENDING",
    "DELETION_PENDING",
    "ACCOUNT_INACTIVE",
    "UNCONFIRMED",
    "LOCK_CONFLICT",
  ])("maneja %s sin reenviar automáticamente", async (code) => {
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiError("proveedor", code === "UNCONFIRMED" ? 503 : 409, { code }),
    );
    show();
    await screen.findByLabelText("Cohorte");
    fireEvent.click(confirm());
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).not.toHaveTextContent("proveedor");
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledTimes(1);
    if (
      ["ENROLLMENT_NOT_PENDING", "DELETION_PENDING", "ACCOUNT_INACTIVE", "UNCONFIRMED"].includes(
        code,
      )
    )
      expect(confirm()).toBeDisabled();
    if (code === "DELETION_PENDING") expect(callbacks.onDeletionPending).toHaveBeenCalledOnce();
    if (code === "ACCOUNT_INACTIVE")
      expect(screen.getByRole("alert")).toHaveTextContent(/reactívalo primero/);
    if (code === "UNCONFIRMED")
      expect(screen.getByRole("alert")).toHaveTextContent(/verifica antes de repetir/);
    fireEvent.click(screen.getByRole("button", { name: "Recargar ficha" }));
    expect(callbacks.onReload).toHaveBeenCalledOnce();
  });
  it("rechazo desconocido conserva message; fallo de red bloquea repetir", async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError("Mensaje general", 400));
    show();
    await screen.findByLabelText("Cohorte");
    fireEvent.click(confirm());
    await screen.findByText("Mensaje general");
    vi.mocked(api.post).mockRejectedValueOnce(new TypeError("network"));
    fireEvent.click(confirm());
    await screen.findByText(/verifica antes de repetir/);
    expect(confirm()).toBeDisabled();
    expect(api.post).toHaveBeenCalledTimes(2);
  });
  it("cancelar no muta matrícula", async () => {
    show();
    await screen.findByLabelText("Cohorte");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(callbacks.onClose).toHaveBeenCalledOnce();
    expect(api.post).not.toHaveBeenCalled();
  });
});
describe("integración en ficha", () => {
  it("reconsulta la ficha al cerrar un resultado incierto antes de permitir otra asignación", async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError("incierto", 503, { code: "UNCONFIRMED" }));
    show();
    await screen.findByLabelText("Cohorte");
    fireEvent.click(confirm());
    await screen.findByText(/verifica antes de repetir/);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(callbacks.onReload).toHaveBeenCalledOnce();
    expect(callbacks.onClose).not.toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it("ofrece recargar ficha si GET informa cuenta inactiva", async () => {
    vi.mocked(api.get).mockRejectedValue(
      new ApiError("inactivo", 403, { code: "ACCOUNT_INACTIVE" }),
    );
    show();
    await screen.findByText(/reactívalo primero/);
    expect(confirm()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Recargar ficha" }));
    expect(callbacks.onReload).toHaveBeenCalledOnce();
    expect(api.post).not.toHaveBeenCalled();
  });
  it("solo ofrece acción en pendientes; inactivo explica reactivar primero", () => {
    render(
      <StudentProfile
        student={{
          ...studentProfile,
          activo: false,
          enrollments: [
            pendingEnrollment,
            { ...pendingEnrollment, enrollmentId: "otra", status: "activo" },
          ],
        }}
        onAssignCohort={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("button", { name: "Asignar cohorte" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Asignar cohorte" })).toBeDisabled();
    expect(screen.getByText(/Reactiva al alumno primero/)).toBeInTheDocument();
  });
  it("éxito cierra modal, recarga ficha y muestra aviso; bloquea acciones al abrir", async () => {
    const profile = { ...studentProfile, enrollments: [pendingEnrollment] };
    vi.mocked(api.get).mockImplementation(async (path) =>
      path.endsWith("/reservas-pendientes")
        ? []
        : path.endsWith("/cohortes")
          ? cohortOptions
          : profile,
    );
    render(<StudentDetail id={studentProfile.id} />);
    fireEvent.click(await screen.findByRole("button", { name: "Asignar cohorte" }));
    expect(screen.getByRole("button", { name: "Editar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Desactivar" })).toBeDisabled();
    await screen.findByLabelText("Cohorte");
    fireEvent.click(confirm());
    await screen.findByText("La cohorte se asignó correctamente.");
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(`/admin/estudiantes/${studentProfile.id}`),
    );
    expect(
      vi
        .mocked(api.get)
        .mock.calls.filter(([p]) => p === `/admin/estudiantes/${studentProfile.id}`),
    ).toHaveLength(2);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("eliminación pendiente conocida bloquea edición y nuevas asignaciones al cerrar", async () => {
    vi.mocked(api.get).mockImplementation(async (path) =>
      path.endsWith("/reservas-pendientes")
        ? []
        : path.endsWith("/cohortes")
          ? cohortOptions
          : { ...studentProfile, enrollments: [pendingEnrollment] },
    );
    vi.mocked(api.post).mockRejectedValue(
      new ApiError("proveedor", 409, { code: "DELETION_PENDING" }),
    );
    render(<StudentDetail id={studentProfile.id} />);
    fireEvent.click(await screen.findByRole("button", { name: "Asignar cohorte" }));
    await screen.findByLabelText("Cohorte");
    fireEvent.click(confirm());
    await screen.findByRole("alert");
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Editar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Asignar cohorte" })).toBeDisabled();
  });
});
