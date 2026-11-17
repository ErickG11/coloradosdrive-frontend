import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { confirmStudentIdentity, studentIdentityError } from "@/lib/api/studentIdentity";
vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());

describe("confirmación de identidad del administrador", () => {
  it("envía un cuerpo vacío cuando no hay observación", async () => {
    await confirmStudentIdentity("uuid");
    await confirmStudentIdentity("uuid", "");
    expect(vi.mocked(api.post).mock.calls.map((call) => call.slice(0, 2))).toEqual([
      ["/admin/estudiantes/uuid/identidad-presencial", {}],
      ["/admin/estudiantes/uuid/identidad-presencial", {}],
    ]);
  });
  it("envía la observación cuando existe", async () => {
    await confirmStudentIdentity("uuid", "Se revisó la cédula original");
    expect(vi.mocked(api.post).mock.calls[0].slice(0, 2)).toEqual([
      "/admin/estudiantes/uuid/identidad-presencial",
      { motivo: "Se revisó la cédula original" },
    ]);
  });
  it("ya no menciona el plazo del instructor ni las 48 horas", () => {
    const message = studentIdentityError(new ApiError("x", 409, { code: "VENTANA_IDENTIDAD_NO_VENCIDA" }));
    expect(message.message).not.toMatch(/48|instructor/i);
  });
  it.each([
    ["MOTIVO_INVALIDO", 400, "La observación debe tener entre 10 y 300 caracteres.", false],
    ["ALUMNO_SIN_SOLICITUD", 409, "La matrícula más reciente no proviene de una solicitud de inscripción.", true],
    ["ACCESO_DENEGADO", 403, "Se requiere un administrador activo para confirmar la identidad.", false],
  ])("traduce %s", (code, status, message, reload) => {
    expect(studentIdentityError(new ApiError("x", status, { code }))).toEqual({ message, reload });
  });
  it("un fallo del servidor pide recargar antes de repetir", () => {
    expect(studentIdentityError(new ApiError("x", 503)).reload).toBe(true);
  });
});
