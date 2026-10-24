"use client";
import { Suspense, useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button, PageHeader, SearchInput, buttonClassName } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import type { Course, Cohort, StudentList } from "@/types";
import {
  buildStudentListQuery,
  changeStudentFilter,
  readStudentFilters,
  studentFilterParams,
  studentListHref,
  type StudentFilters as Filters,
} from "@/lib/api/students";
import { StudentFilters } from "./StudentFilters";
import { StudentTable } from "./StudentTable";
import { StudentMetrics } from "./StudentMetrics";
import { StudentDrawer } from "./StudentDrawer";
import { StudentPagination } from "./StudentPagination";
import { StudentIcon } from "./StudentVisual";
import { useStudentDocuments } from "./useStudentDocuments";
import type { AdminStudent } from "@/types";
import styles from "./students.module.css";

const EMPTY_STUDENTS: AdminStudent[] = [];

export function StudentsList() {
  const params = useSearchParams();
  const pathname = usePathname();
  const selected = pathname.match(/^\/admin\/students\/([0-9a-f-]+)$/i)?.[1] ?? null;
  const [version, setVersion] = useState(0);
  const filters = readStudentFilters(params);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);
  const courses = useFetch<Course[]>("/courses");
  const cohorts = useFetch<Cohort[]>("/cohorts");
  // Search remains transient: the existing query and URL whitelist are unchanged.
  const list = useFetch<StudentList>(
    `/admin/estudiantes?${buildStudentListQuery(filters, search)}`,
  );
  const documents = useStudentDocuments(list.data?.items ?? EMPTY_STUDENTS, version);
  function open(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    window.history.pushState(null, "", `/admin/students/${id}?${studentFilterParams(filters)}`);
  }
  function close() {
    window.history.pushState(null, "", studentListHref(filters));
  }
  function refresh() {
    list.refetch();
    setVersion((v) => v + 1);
  }
  function change(value: Partial<Filters>) {
    window.history.replaceState(
      null,
      "",
      `${selected ? `/admin/students/${selected}` : "/admin/students"}?${studentFilterParams(changeStudentFilter(filters, value))}`,
    );
  }
  function searchFor(value: string) {
    setQ(value);
    if (filters.page !== 1) change({});
  }
  function clearFilters() {
    setQ("");
    change({
      courseId: "",
      cohortId: "",
      activo: "",
      pendienteCohorte: "",
      documentosPendientes: "",
      incluirHistorial: false,
    });
  }
  const filtered = Boolean(
    q.trim() ||
    filters.courseId ||
    filters.cohortId ||
    filters.activo ||
    filters.pendienteCohorte ||
    filters.documentosPendientes ||
    filters.incluirHistorial,
  );
  const catalogError = courses.error || cohorts.error;
  return (
    <div className={styles.page} data-panel-open={Boolean(selected)}>
      <div className={styles.topbar}>
        <SearchInput
          name="studentSearch"
          label="Buscar por nombre, cédula o teléfono"
          placeholder="Buscar alumnos por nombre, cédula o teléfono…"
          maxLength={80}
          value={q}
          shortcut
          onChange={(event) => searchFor(event.target.value)}
          onClear={() => searchFor("")}
        />
        <span>Colorados Drive · Administración</span>
      </div>
      <div className={styles.workspace}>
        <div className={styles.main}>
          <PageHeader
            title="Alumnos"
            count={list.data?.total}
            description="Consulta sus cuentas, cursos y cohortes."
            actions={
              <>
                <Link className={buttonClassName("secondary")} href="/admin/students/deletions">
                  Eliminaciones pendientes
                </Link>
                <Link className={buttonClassName()} href="/admin/enrollments">
                  <StudentIcon name="plus" /> Matricular estudiante
                </Link>
              </>
            }
          />
          <StudentMetrics version={version} />
          {params.get("aviso") === "alumno-eliminado" ? (
            <p role="status" className="text-status-success">
              El alumno se eliminó definitivamente.
            </p>
          ) : null}
          <StudentFilters
            renderSearch={false}
            filters={filters}
            q={q}
            courses={courses.data ?? []}
            cohorts={cohorts.data ?? []}
            onSearch={searchFor}
            onChange={change}
            onClear={clearFilters}
          />
          {catalogError ? (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 rounded-sm border border-border bg-status-error-bg p-3 text-sm text-status-error"
            >
              <span>No se pudieron cargar los cursos o cohortes. {catalogError}</span>
              <Button
                variant="secondary"
                onClick={() => {
                  courses.refetch();
                  cohorts.refetch();
                }}
              >
                Reintentar catálogos
              </Button>
            </div>
          ) : null}
          <StudentTable
            students={list.data?.items ?? []}
            cohorts={cohorts.data ?? []}
            filterQuery={studentFilterParams(filters).toString()}
            isLoading={list.isLoading}
            error={list.error}
            onRetry={list.refetch}
            filtered={filtered}
            onClear={clearFilters}
            onOpen={open}
            documents={documents}
          />
          {!list.isLoading && !list.error && (list.data?.total ?? 0) > 0 ? (
            <StudentPagination
              total={list.data!.total}
              page={filters.page}
              onChange={(page) =>
                window.history.replaceState(
                  null,
                  "",
                  `${selected ? `/admin/students/${selected}` : "/admin/students"}?${studentFilterParams({ ...filters, page })}`,
                )
              }
            />
          ) : null}
        </div>
        <StudentDrawer id={selected} onClose={close} onChanged={refresh} />
      </div>
    </div>
  );
}
export default function StudentsPage() {
  return (
    <Suspense fallback={<p role="status">Cargando alumnos…</p>}>
      <StudentsList />
    </Suspense>
  );
}
