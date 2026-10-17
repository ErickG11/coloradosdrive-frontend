import { describe, expect, it } from "vitest";
import {
  buildStudentListQuery,
  changeStudentFilter,
  readStudentFilters,
  studentListHref,
} from "@/lib/api/students";

describe("query de alumnos", () => {
  it("omite vacíos y conserva false sin incluir q en navegación", () => {
    const filters = readStudentFilters(
      new URLSearchParams("activo=false&documentosPendientes=false&page=3&q=privado&unknown=x"),
    );
    const query = new URLSearchParams(buildStudentListQuery(filters, "  0000000001  "));
    expect(query.get("activo")).toBe("false");
    expect(query.get("documentosPendientes")).toBe("false");
    expect(query.get("q")).toBe("0000000001");
    expect(query.has("courseId")).toBe(false);
    expect(query.get("pageSize")).toBe("20");
    expect(query.has("unknown")).toBe(false);
    expect(studentListHref(filters)).toBe(
      "/admin/students?page=3&documentosPendientes=false&activo=false",
    );
    expect(new URLSearchParams(buildStudentListQuery(filters, " ")).has("q")).toBe(false);
  });
  it("reinicia página al cambiar filtros y sanea parámetros inválidos", () => {
    const filters = readStudentFilters(
      new URLSearchParams("page=9&activo=mal&courseId=not-uuid&incluirHistorial=true"),
    );
    expect(changeStudentFilter(filters, { activo: "false" })).toMatchObject({
      page: 1,
      activo: "false",
      incluirHistorial: true,
    });
    expect(readStudentFilters(new URLSearchParams("page=-2"))).toMatchObject({
      page: 1,
      courseId: "",
      activo: "",
    });
  });
});
