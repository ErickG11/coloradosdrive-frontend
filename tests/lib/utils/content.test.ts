import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import {
  buildAccessPayload,
  contentErrorMessage,
  guayaquilToIso,
  isoToGuayaquil,
} from "@/lib/utils/content";
import type { AccessDraft, ContentScope } from "@/types/content";
const id = "00000000-0000-4000-8000-000000000001";
const scope: ContentScope = { scope: "item", id, title: "Examen", courseId: id, hasExams: true };
const draft: AccessDraft = {
  targetType: "cohorte",
  targetId: id,
  enabled: true,
  opens: "",
  closes: "",
  attempts: "",
  extra: "0",
  note: "",
};
describe("fechas Guayaquil", () => {
  it("convierte fechas civiles a offset explícito y admite límites vacíos", () => {
    expect(guayaquilToIso("2026-11-10T09:30")).toBe("2026-11-10T09:30:00-05:00");
    expect(guayaquilToIso("")).toBeNull();
    expect(isoToGuayaquil(null)).toBe("");
  });
  it("convierte desde otras zonas sin depender de la zona del navegador", () => {
    expect(isoToGuayaquil("2026-11-10T14:30:00Z")).toBe("2026-11-10T09:30");
    expect(isoToGuayaquil("2026-11-10T16:30:00+02:00")).toBe("2026-11-10T09:30");
    expect(isoToGuayaquil("2026-11-10T05:00:00Z")).toBe("2026-11-10T00:00");
  });
  it.each([
    "2026-02-30T12:00",
    "2026-13-01T12:00",
    "2026-01-01T25:00",
    "2026-01-01",
    "2026-01-01T12:00Z",
  ])("rechaza fecha civil inválida %s", (value) => expect(() => guayaquilToIso(value)).toThrow());
});
describe("errores de contenido", () => {
  it.each([
    "ITEM_NOT_FOUND",
    "ITEM_NO_HABILITADO",
    "ITEM_PROGRAMADO",
    "ITEM_CERRADO",
    "ATTEMPTS_EXHAUSTED",
    "ALREADY_PASSED",
    "EXAM_NOT_PUBLISHED",
    "EXAM_STRUCTURE_FROZEN",
    "EXAM_INVALID_QUESTIONS",
    "CONTENT_HAS_DEPENDENCIES",
    "UPLOAD_DAILY_LIMIT",
    "INVALID_CONTENT",
    "CONTENT_UNAVAILABLE",
  ])("mapea %s sin mostrar texto crudo", (code) => {
    const value = contentErrorMessage(new ApiError("SQL SECRET raw stack", 409, { code }));
    expect(value).not.toContain("SQL SECRET");
    expect(value.length).toBeGreaterThan(15);
  });
  it("traduce errores de validación y conexión desconocidos", () => {
    expect(contentErrorMessage(new ApiError("invalid input syntax", 400))).toContain("campos");
    expect(contentErrorMessage(new Error("private URL"))).not.toContain("private URL");
    expect(contentErrorMessage(new ApiError("raw", 500, { code: "UNKNOWN" }))).toContain(
      "conectar",
    );
  });
});
describe("payload de habilitación", () => {
  const now = Date.parse("2026-11-09T12:00:00Z");
  it("envía configuración completa, null de herencia y fechas con offset", () => {
    expect(
      buildAccessPayload(
        scope,
        { ...draft, opens: "2026-11-10T09:00", closes: "2026-11-11T09:00", note: " nota " },
        now,
      ),
    ).toEqual({
      scope: "item",
      scope_id: id,
      target_type: "cohorte",
      target_id: id,
      habilitado: true,
      opens_at: "2026-11-10T09:00:00-05:00",
      closes_at: "2026-11-11T09:00:00-05:00",
      max_attempts: null,
      extra_minutes: 0,
      note: "nota",
    });
  });
  it("bloquea sin enviar cierre vencido o inválido", () => {
    expect(
      buildAccessPayload(scope, { ...draft, enabled: false, closes: "pasado inválido" }, now)
        .closes_at,
    ).toBeNull();
  });
  it("conserva la precisión de fechas precargadas sin convertirlas por la zona del navegador", () => {
    expect(
      buildAccessPayload(
        scope,
        { ...draft, opens: "2026-11-10T09:30", sourceOpens: "2026-11-10T14:30:42.123456Z" },
        now,
      ).opens_at,
    ).toBe("2026-11-10T09:30:42.123456-05:00");
  });
  it.each([
    { closes: "2026-11-08T00:00" },
    { opens: "2026-11-11T10:00", closes: "2026-11-11T09:00" },
    { opens: "2026-11-11T10:00", closes: "2026-11-11T10:00" },
    { attempts: "0" },
    { attempts: "21" },
    { attempts: "1.5" },
    { extra: "181" },
    { extra: "-1" },
    { targetId: "invalid" },
    { note: "x".repeat(301) },
  ])("rechaza configuración inválida %j", (change) =>
    expect(() => buildAccessPayload(scope, { ...draft, ...change }, now)).toThrow(),
  );
  it("admite límites y solo aplica intentos/minutos a exámenes", () => {
    expect(
      buildAccessPayload(
        { ...scope, scope: "curso" },
        { ...draft, targetType: "estudiante", attempts: "20", extra: "180" },
        now,
      ),
    ).toMatchObject({
      scope: "curso",
      target_type: "estudiante",
      max_attempts: 20,
      extra_minutes: 180,
    });
    expect(
      buildAccessPayload(
        { ...scope, hasExams: false },
        { ...draft, attempts: "20", extra: "180" },
        now,
      ),
    ).toMatchObject({ max_attempts: null, extra_minutes: 0 });
  });
});
