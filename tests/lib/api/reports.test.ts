import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ token: vi.fn(), mfa: vi.fn() }));
vi.mock("@/lib/api/client", () => ({
  getAccessToken: mocks.token,
  redirigirAlDesafioMfa: mocks.mfa,
}));

import { ApiError } from "@/lib/api/errors";
import {
  downloadReport,
  fallbackReportFileName,
  fileNameFromDisposition,
  reportErrorMessage,
  reportFilterSummary,
  reportQuery,
  validateReportFilters,
} from "@/lib/api/reports";
import type { ReportFilters } from "@/types/report";

const filters: ReportFilters = {
  desde: "2026-11-01",
  hasta: "2026-11-30",
  tipoCurso: "todos",
  cohorteId: "",
  tipo: "todos",
};
const cohort = "10000000-0000-4000-8000-00000000000b";
const fetchMock = vi.fn();
const fileResponse = (headers: Record<string, string> = {}) =>
  new Response("%PDF-1.3 contenido", {
    status: 200,
    headers: { "Content-Type": "application/pdf", ...headers },
  });
const errorResponse = (status: number, body?: unknown) =>
  new Response(body === undefined ? "sin json" : JSON.stringify(body), { status });
async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("Se esperaba un error");
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  mocks.token.mockReset().mockResolvedValue("jwt-de-prueba");
  mocks.mfa.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("filtros de reportes", () => {
  it("acepta un período válido", () => {
    expect(validateReportFilters(filters)).toEqual({});
    expect(validateReportFilters({ ...filters, desde: "2026-11-30" })).toEqual({});
  });

  it("marca el error junto al campo que corresponde", () => {
    expect(validateReportFilters({ ...filters, desde: "" })).toEqual({
      desde: "Indica la fecha inicial.",
    });
    expect(validateReportFilters({ ...filters, hasta: "" })).toEqual({
      hasta: "Indica la fecha final.",
    });
    expect(validateReportFilters({ ...filters, desde: "2026-02-30" }).desde).toBe(
      "La fecha inicial no es válida.",
    );
    expect(validateReportFilters({ ...filters, desde: "2026-12-01" })).toEqual({
      desde: "La fecha inicial no puede ser posterior a la fecha final.",
    });
    expect(validateReportFilters({ ...filters, desde: "1999-12-31" }).desde).toBe(
      "La fecha inicial no puede ser anterior al año 2000.",
    );
  });

  it("limita el período a 366 días", () => {
    expect(validateReportFilters({ ...filters, desde: "2024-01-01", hasta: "2024-12-31" })).toEqual(
      {},
    );
    expect(validateReportFilters({ ...filters, desde: "2025-01-01", hasta: "2026-01-02" })).toEqual(
      { hasta: "El período no puede superar 366 días." },
    );
  });

  it("envía exactamente los filtros activos y omite la cohorte vacía", () => {
    expect(Object.fromEntries(reportQuery(filters, "pdf"))).toEqual({
      desde: "2026-11-01",
      hasta: "2026-11-30",
      tipoCurso: "todos",
      tipo: "todos",
      formato: "pdf",
    });
    expect(
      Object.fromEntries(
        reportQuery({ ...filters, tipoCurso: "B", cohorteId: cohort, tipo: "finanzas" }, "xlsx"),
      ),
    ).toEqual({
      desde: "2026-11-01",
      hasta: "2026-11-30",
      tipoCurso: "B",
      tipo: "finanzas",
      cohorteId: cohort,
      formato: "xlsx",
    });
  });

  it("resume los filtros en texto legible", () => {
    expect(
      reportFilterSummary({ ...filters, tipoCurso: "A", cohorteId: cohort }, "Cohorte Ñ"),
    ).toEqual([
      { label: "Período", value: "01/11/2026 al 30/11/2026" },
      { label: "Tipo de curso", value: "Tipo A" },
      { label: "Cohorte", value: "Cohorte Ñ" },
      { label: "Reporte", value: "Todos los reportes" },
    ]);
    expect(reportFilterSummary(filters)[2].value).toBe("Todas");
  });
});

describe("nombre del archivo", () => {
  it("usa el de Content-Disposition si es un nombre simple", () => {
    expect(
      fileNameFromDisposition('attachment; filename="reporte-finanzas-2026-11-01_2026-11-30.pdf"'),
    ).toBe("reporte-finanzas-2026-11-01_2026-11-30.pdf");
    expect(fileNameFromDisposition("attachment; filename=reporte-todos.xlsx")).toBe(
      "reporte-todos.xlsx",
    );
  });

  it("rechaza nombres con rutas o caracteres extraños", () => {
    for (const header of [
      null,
      "attachment",
      'attachment; filename="../../etc/passwd"',
      'attachment; filename="a b.pdf"',
      'attachment; filename=".oculto"',
      'attachment; filename="<script>.pdf"',
    ])
      expect(fileNameFromDisposition(header)).toBeNull();
    expect(fallbackReportFileName(filters, "xlsx")).toBe(
      "reporte-todos-2026-11-01_2026-11-30.xlsx",
    );
  });
});

describe("mensajes de error en español", () => {
  it.each([
    [400, undefined, "La fecha inicial no puede ser posterior", /fecha inicial/],
    [400, undefined, undefined, /Revisa los filtros/],
    [401, undefined, "Invalid or expired token", /Tu sesión expiró/],
    [403, undefined, "Insufficient permissions", /Solo el administrador/],
    [403, "PERMISO_REQUERIDO", "x", /reportes financieros/],
    [403, "MFA_REQUERIDA", "x", /segundo factor/],
    [413, "REPORTE_DEMASIADOS_DATOS", "x", /Acota el rango de fechas/],
    [429, "LIMITE_PETICIONES", "x", /demasiadas exportaciones/],
    [429, "EXPORTACION_OCUPADA", "x", /otras exportaciones en curso/],
    [500, undefined, "Internal server error", /No pudimos generar el reporte/],
    [503, "AUDITORIA_NO_DISPONIBLE", "x", /No pudimos generar el reporte/],
  ])("%s %s", (status, code, server, expected) => {
    const message = reportErrorMessage(status, code, server);
    expect(message).toMatch(expected);
    expect(message).not.toMatch(/Internal|Invalid|Insufficient/);
  });
});

describe("descarga autenticada", () => {
  it("pide el archivo con Authorization y devuelve el blob con el nombre del servidor", async () => {
    fetchMock.mockResolvedValue(
      fileResponse({
        "Content-Disposition": 'attachment; filename="reporte-finanzas-2026-11-01_2026-11-30.pdf"',
      }),
    );
    const controller = new AbortController();
    const file = await downloadReport({ ...filters, tipo: "finanzas" }, "pdf", controller.signal);
    expect(file.fileName).toBe("reporte-finanzas-2026-11-01_2026-11-30.pdf");
    expect(file.blob.size).toBeGreaterThan(0);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "http://localhost:3000/admin/reportes/exportar?desde=2026-11-01&hasta=2026-11-30&tipoCurso=todos&tipo=finanzas&formato=pdf",
    );
    expect(init.headers).toEqual({ Authorization: "Bearer jwt-de-prueba" });
    expect(init.method).toBe("GET");
    expect(init.cache).toBe("no-store");
    expect(init.signal).toBe(controller.signal);
  });

  it("si el servidor no expone el nombre, usa uno propio con los mismos filtros", async () => {
    fetchMock.mockResolvedValue(fileResponse());
    expect((await downloadReport(filters, "xlsx")).fileName).toBe(
      "reporte-todos-2026-11-01_2026-11-30.xlsx",
    );
  });

  it("convierte los errores del servidor en mensajes claros y conserva el campo", async () => {
    fetchMock.mockResolvedValue(
      errorResponse(400, {
        message: "La cohorte seleccionada no existe",
        code: "COHORTE_NO_ENCONTRADA",
        field: "cohorteId",
      }),
    );
    const invalid = await failure(downloadReport(filters, "pdf"));
    expect(invalid).toMatchObject({
      status: 400,
      message: "La cohorte seleccionada no existe",
      field: "cohorteId",
    });
    fetchMock.mockResolvedValue(errorResponse(429, { message: "x", code: "LIMITE_PETICIONES" }));
    expect((await failure(downloadReport(filters, "pdf"))).message).toMatch(
      /demasiadas exportaciones/,
    );
    fetchMock.mockResolvedValue(errorResponse(500));
    expect((await failure(downloadReport(filters, "pdf"))).message).toMatch(
      /No pudimos generar el reporte/,
    );
  });

  it("lleva al desafío de segundo factor cuando el servidor lo exige", async () => {
    fetchMock.mockResolvedValue(errorResponse(403, { message: "x", code: "MFA_REQUERIDA" }));
    await failure(downloadReport(filters, "pdf"));
    expect(mocks.mfa).toHaveBeenCalledTimes(1);
  });

  it("informa la falta de conexión y un archivo vacío", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect((await failure(downloadReport(filters, "pdf"))).message).toMatch(/No se pudo conectar/);
    fetchMock.mockResolvedValue(new Response("", { status: 200 }));
    expect((await failure(downloadReport(filters, "pdf"))).message).toMatch(/archivo vacío/);
  });

  it("propaga la cancelación sin convertirla en error visible", async () => {
    fetchMock.mockRejectedValue(new DOMException("Aborted", "AbortError"));
    await expect(downloadReport(filters, "pdf")).rejects.toMatchObject({ name: "AbortError" });
  });
});
