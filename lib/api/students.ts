export interface StudentFilters {
  courseId: string;
  cohortId: string;
  pendienteCohorte: string;
  documentosPendientes: string;
  activo: string;
  incluirHistorial: boolean;
  page: number;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function readStudentFilters(params: Pick<URLSearchParams, "get">): StudentFilters {
  const boolean = (key: string) =>
    ["true", "false"].includes(params.get(key) ?? "") ? params.get(key)! : "";
  const id = (key: string) => (uuid.test(params.get(key) ?? "") ? params.get(key)! : "");
  const page = Number(params.get("page") ?? 1);
  return {
    courseId: id("courseId"),
    cohortId: id("cohortId"),
    pendienteCohorte: boolean("pendienteCohorte"),
    documentosPendientes: boolean("documentosPendientes"),
    activo: boolean("activo"),
    incluirHistorial: params.get("incluirHistorial") === "true",
    page: Number.isInteger(page) && page >= 1 && page <= 100000 ? page : 1,
  };
}
// URL state is explicitly whitelisted: q must never leak into navigation URLs.
export function studentFilterParams(filters: StudentFilters): URLSearchParams {
  const params = new URLSearchParams({ page: String(filters.page) });
  for (const field of [
    "courseId",
    "cohortId",
    "pendienteCohorte",
    "documentosPendientes",
    "activo",
  ] as const)
    if (filters[field] !== "") params.set(field, filters[field]);
  if (filters.incluirHistorial) params.set("incluirHistorial", "true");
  return params;
}
export function buildStudentListQuery(filters: StudentFilters, q: string, pageSize = 20): string {
  const params = studentFilterParams(filters);
  params.set("pageSize", String(pageSize));
  if (q.trim()) params.set("q", q.trim());
  return params.toString();
}
export function changeStudentFilter(
  filters: StudentFilters,
  change: Partial<StudentFilters>,
): StudentFilters {
  return { ...filters, ...change, page: 1 };
}
export function studentListHref(filters: StudentFilters): string {
  return `/admin/students?${studentFilterParams(filters)}`;
}
