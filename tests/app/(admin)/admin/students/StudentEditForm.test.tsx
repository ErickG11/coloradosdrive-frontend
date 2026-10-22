import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentEditForm } from "@/app/(admin)/admin/students/StudentEditForm";
import {
  StudentDetail,
  StudentProfile,
  studentTimestamp,
} from "@/app/(admin)/admin/students/StudentDetail";
import { studentProfile as student } from "@/tests/fixtures/studentProfile";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { unconfirmedMessage } from "@/lib/api/studentProfile";
import { useFetch } from "@/hooks/useFetch";
import { BIRTH_DATE_MESSAGES as BIRTH, schoolToday } from "@/lib/utils/birthDate";
vi.mock("@/lib/api/client", () => ({ api: { patch: vi.fn() } }));
vi.mock("@/hooks/useFetch", () => ({ useFetch: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("page=2"),
  useRouter: () => ({ replace: vi.fn() }),
}));
const saved = vi.fn(),
  cancel = vi.fn(),
  reload = vi.fn(),
  busy = vi.fn();
function form() {
  return render(
    <StudentEditForm
      student={student}
      onSaved={saved}
      onCancel={cancel}
      onReload={reload}
      onBusyChange={busy}
    />,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.patch).mockResolvedValue({
    operationId: "test-operation",
    changedFields: ["nombre_completo"],
    updatedAt: "2026-01-05T16:00:00.123456Z",
  });
});
describe("StudentEditForm", () => {
  it("sin cambios no llama al backend, incluso enviando el formulario", () => {
    form();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("button", { name: "Guardar cambios" }).closest("form")!);
    expect(api.patch).not.toHaveBeenCalled();
  });
  it("valida y muestra avisos de cédula y correo", () => {
    form();
    fireEvent.change(screen.getByLabelText("Cédula"), { target: { value: "invalida" } });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "otro@example.test" },
    });
    expect(
      screen.getByText("La cédula identifica al alumno en todo el sistema."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("El correo es con el que inicia sesión; el alumno deberá usar el nuevo."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(screen.getByLabelText("Cédula")).toHaveAttribute("aria-invalid", "true");
    expect(api.patch).not.toHaveBeenCalled();
  });
  it("el campo de fecha de nacimiento no lleva min ni max: el calendario no bloquea ninguna fecha", () => {
    form();
    const input = screen.getByLabelText("Fecha de nacimiento");
    expect(input).not.toHaveAttribute("min");
    expect(input).not.toHaveAttribute("max");
  });
  it.each([
    ["más de 100 años", "1800-01-01", BIRTH.edadMaxima],
    ["hoy", schoolToday(), BIRTH.edadMinima],
    ["este mes", `${schoolToday().slice(0, 8)}01`, BIRTH.edadMinima],
    ["hace 14 años", `${String(Number(schoolToday().slice(0, 4)) - 14)}-12-31`, BIRTH.edadMinima],
    ["una fecha futura", "2999-01-01", BIRTH.futura],
  ])("fecha de nacimiento %s: se puede escribir y muestra su mensaje junto al campo", (_n, value, message) => {
    form();
    const input = screen.getByLabelText("Fecha de nacimiento");
    fireEvent.change(input, { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(message)).toHaveAttribute("role", "alert");
    expect(api.patch).not.toHaveBeenCalled();
  });
  it("un alumno con fecha antigua fuera de rango guarda otros campos sin reenviar ni bloquear la fecha", async () => {
    render(
      <StudentEditForm
        student={{ ...student, fechaNacimiento: "1900-01-01" }}
        onSaved={saved}
        onCancel={cancel}
        onReload={reload}
        onBusyChange={busy}
      />,
    );
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Corregido" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    const body = vi.mocked(api.patch).mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("fechaNacimiento");
    expect(screen.queryByText(BIRTH.edadMaxima)).not.toBeInTheDocument();
  });
  it("envía solo lo modificado y notifica éxito", async () => {
    form();
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Corregido" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(api.patch).toHaveBeenCalledWith(`/admin/estudiantes/${student.id}`, {
      updatedAt: student.updatedAt,
      nombreCompleto: "Corregido",
    });
  });
  it.each([
    [400, undefined, undefined, "Mensaje general"],
    [409, "CEDULA_DUPLICATE", "cedula", "Cédula duplicada"],
    [409, "EMAIL_DUPLICATE", "correo", "Correo duplicado"],
    [400, "INVALID_FIELD", "direccion", "Dirección inválida"],
    [400, "BIRTH_DATE_TOO_YOUNG", "fechaNacimiento", BIRTH.edadMinima],
    [400, "BIRTH_DATE_FUTURE", "fechaNacimiento", BIRTH.futura],
    [400, "BIRTH_DATE_TOO_OLD", "fechaNacimiento", BIRTH.edadMaxima],
    [409, "VERSION_CONFLICT", undefined, "Conflicto"],
    [503, "UNCONFIRMED", undefined, "Incierto"],
  ])("maneja %s/%s", async (status, code, field, message) => {
    vi.mocked(api.patch).mockRejectedValue(new ApiError(message, status, { code, field }));
    form();
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Corregido" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    if (field) {
      const label =
        field === "cedula"
          ? "Cédula"
          : field === "correo"
            ? "Correo electrónico"
            : field === "fechaNacimiento"
              ? "Fecha de nacimiento"
              : "Dirección";
      await waitFor(() =>
        expect(screen.getByLabelText(label)).toHaveAttribute("aria-invalid", "true"),
      );
      expect(screen.getByText(message)).toBeInTheDocument();
    } else {
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(
          status === 503
            ? unconfirmedMessage
            : status === 409
              ? "Otro administrador modificó este alumno"
              : message,
        ),
      );
    }
    if (status === 503 || code === "VERSION_CONFLICT") {
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Recargar ficha" }));
      expect(reload).toHaveBeenCalledOnce();
    }
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(saved).not.toHaveBeenCalled();
  });
  it("fechas, apertura del modal, éxito y refresco de la ficha", async () => {
    const refetch = vi.fn();
    vi.mocked(useFetch).mockReturnValue({ data: student, isLoading: false, error: null, refetch });
    render(<StudentDetail id={student.id} />);
    expect(screen.getByText(/Registrado el/)).toHaveTextContent(
      studentTimestamp(student.createdAt),
    );
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = within(screen.getByRole("dialog", { name: "Editar alumno" }));
    fireEvent.change(dialog.getByLabelText("Nombre completo"), { target: { value: "Corregido" } });
    fireEvent.click(dialog.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(screen.getByRole("status")).toHaveTextContent("se guardaron correctamente");
  });
  it("muestra la inscripción de cada matrícula", () => {
    render(
      <StudentProfile
        student={{
          ...student,
          enrollments: [
            {
              enrollmentId: "enrollment-test",
              studentId: student.id,
              cohortId: null,
              courseId: "course-test",
              courseType: "A",
              status: "pendiente_cohorte",
              fechaInscripcion: "2026-03-10T15:00:00Z",
              curso: null,
              cohorte: null,
              montoTotal: null,
              montoAbonado: 0,
              saldo: null,
              descuento: 0,
              precioBruto: null,
              documentosPendientes: 0,
              documentos: [],
            },
          ],
        }}
      />,
    );
    expect(screen.getByText(/Fecha de inscripción/)).toHaveTextContent(
      studentTimestamp("2026-03-10T15:00:00Z"),
    );
  });
});
