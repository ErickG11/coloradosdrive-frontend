import { describe, expect, it } from "vitest";
import {
  buildStudentPatch,
  studentDraft,
  studentEditError,
  validateStudentPatch,
  validStudentCedula,
  unconfirmedMessage,
} from "@/lib/api/studentProfile";
import { ApiError } from "@/lib/api/errors";
import { studentProfile as student } from "@/tests/fixtures/studentProfile";
describe("edición de perfil: contrato", () => {
  it("solo envía cambios, limpia opcionales con null y conserva versión exacta sin operationId", () => {
    expect(
      buildStudentPatch(student, {
        ...studentDraft(student),
        nombreCompleto: "  Corregido  ",
        telefono: "",
      }),
    ).toEqual({ updatedAt: student.updatedAt, nombreCompleto: "Corregido", telefono: null });
    expect(buildStudentPatch(student, studentDraft(student))).toBeNull();
    expect(
      buildStudentPatch(student, {
        ...studentDraft(student),
        nombreCompleto: ` ${student.nombreCompleto} `,
      }),
    ).toBeNull();
  });
  it("no inventa cambios de correo si Auth no estaba disponible", () => {
    const unavailable = { ...student, correo: null, correoDisponible: false };
    expect(
      buildStudentPatch(unavailable, {
        ...studentDraft(unavailable),
        nombreCompleto: "Otro",
        correo: "otro@example.test",
      }),
    ).toEqual({ updatedAt: student.updatedAt, nombreCompleto: "Otro" });
  });
  it.each([
    ["nombreCompleto", ""],
    ["nombreCompleto", "x".repeat(201)],
    ["cedula", "0100000000"],
    ["cedula", "9900000000"],
    ["correo", "mal"],
    ["correo", "x".repeat(255)],
    ["telefono", "x".repeat(21)],
    ["direccion", "x".repeat(501)],
    ["tipoSangre", "x".repeat(501)],
    ["genero", "x".repeat(501)],
    ["ciudadania", "x".repeat(501)],
    ["fechaNacimiento", "2026-02-30"],
    ["fechaNacimiento", "1900-02-29"],
    ["fechaNacimiento", "0000-01-01"],
    ["fechaNacimiento", "2000-2-01"],
  ])("valida %s", (field, value) => {
    expect(validateStudentPatch({ updatedAt: student.updatedAt, [field]: value })).toHaveProperty(
      field,
    );
  });
  it("acepta cédula ecuatoriana, fecha bisiesta y limpieza opcional", () => {
    expect(validStudentCedula(student.cedula)).toBe(true);
    expect(
      validateStudentPatch({
        updatedAt: student.updatedAt,
        cedula: student.cedula,
        fechaNacimiento: "2000-02-29",
        telefono: null,
      }),
    ).toEqual({});
  });
  it.each([
    ["CEDULA_DUPLICATE", 409, "cedula", false],
    ["EMAIL_DUPLICATE", 409, "correo", false],
    ["INVALID_FIELD", 400, "direccion", false],
    ["VERSION_CONFLICT", 409, undefined, true],
    ["UNCONFIRMED", 503, undefined, true],
  ])("usa código %s", (code, status, field, reload) => {
    const result = studentEditError(new ApiError("Mensaje específico", status, { code, field }));
    expect(result.field).toBe(field);
    expect(Boolean(result.reload)).toBe(reload);
  });
  it("legacy 400 no adivina campo; 409 reconoce versión o conserva duplicado", () => {
    expect(studentEditError(new ApiError("Cédula incorrecta", 400))).toEqual({
      message: "Cédula incorrecta",
    });
    expect(studentEditError(new ApiError("La cédula ya está registrada", 409))).toEqual({
      message: "La cédula ya está registrada",
    });
    expect(studentEditError(new ApiError("El alumno cambió. Recarga la ficha", 409))).toMatchObject(
      { reload: true },
    );
    expect(studentEditError(new ApiError("Error", 503))).toEqual({
      message: unconfirmedMessage,
      reload: true,
    });
    expect(studentEditError(new Error("red"))).toEqual({
      message: unconfirmedMessage,
      reload: true,
    });
  });
});
