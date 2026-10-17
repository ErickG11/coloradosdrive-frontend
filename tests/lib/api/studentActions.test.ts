import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  deleteStudent,
  setStudentAccess,
  studentActionError,
  studentDeletedHref,
} from "@/lib/api/studentActions";
vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
describe("contrato de acciones de alumnos", () => {
  it("usa POST, UUID y cuerpos exactos; {} solo para reanudar D", async () => {
    await setStudentAccess("uuid", false);
    await setStudentAccess("uuid", true);
    await deleteStudent("uuid", "0100000009");
    await deleteStudent("uuid");
    expect(vi.mocked(api.post).mock.calls).toEqual([
      ["/admin/estudiantes/uuid/desactivar", {}],
      ["/admin/estudiantes/uuid/reactivar", {}],
      ["/admin/estudiantes/uuid/eliminar", { confirmacionCedula: "0100000009" }],
      ["/admin/estudiantes/uuid/eliminar", {}],
    ]);
    expect(studentDeletedHref).toBe("/admin/students?aviso=alumno-eliminado");
  });
  it.each(["CD030", "DELETION_PENDING", "DELETION_INCOMPLETE"])(
    "%s indica eliminación pendiente",
    (code) => {
      expect(studentActionError(new ApiError("proveedor", 409, { code }))).toMatchObject({
        pending: true,
        message: expect.stringMatching(/eliminaci[oó]n/i),
      });
    },
  );
  it.each(["UNCONFIRMED", "ACCOUNT_INACTIVE"])(
    "%s exige verificar sin reenvío automático",
    (code) => {
      expect(studentActionError(new ApiError("proveedor", 503, { code }))).toMatchObject({
        verify: true,
      });
    },
  );
  it("confirmación por campo, desconocido conserva message y red es incierta", () => {
    expect(
      studentActionError(new ApiError("rechazo", 400, { code: "INVALID_CONFIRMATION" }))
        .invalidConfirmation,
    ).toBe(true);
    expect(
      studentActionError(new ApiError("Mensaje general", 400, { code: "FUTURO" })).message,
    ).toBe("Mensaje general");
    expect(studentActionError(new Error("red"))).toMatchObject({ verify: true });
  });
});
