"use client";
import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import styles from "./students.module.css";

const STUDENT_PATH = /^\/admin\/students\/([0-9a-f-]+)$/i;

// Listado de alumnos con la ficha en un panel lateral. /admin/students/[id]
// monta este mismo listado con la ficha abierta; abrir y cerrar desde el
// listado solo cambia la URL (sin recargar la lista).
export function StudentsList({ initialSelected = null }: { initialSelected?: string | null }) {
  const params = useSearchParams();
  const router = useRouter();
  const filters = readStudentFilters(params);
  const [selected, setSelected] = useState<string | null>(initialSelected);
  const [version, setVersion] = useState(0);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);
  // Atrás/Adelante del navegador abre o cierra la ficha según la URL.
  useEffect(() => {
    function sync() {
      setSelected(window.location.pathname.match(STUDENT_PATH)?.[1] ?? null);
    }
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const courses = useFetch<Course[]>("/courses");
  const cohorts = useFetch<Cohort[]>("/cohorts");
  // useFetch's effect cleanup ignores responses belonging to older paths.
  const list = useFetch<StudentList>(
    `/admin/estudiantes?${buildStudentListQuery(filters, search)}`,
  );
  // Con la ficha abierta la URL conserva el alumno; sin ella, va al listado.
  function navigate(next: Filters) {
    if (selected)
      window.history.replaceState(
        null,
        "",
        `/admin/students/${selected}?${studentFilterParams(next)}`,
      );
    else router.replace(studentListHref(next), { scroll: false });
  }
  function change(value: Partial<Filters>) {
    navigate(changeStudentFilter(filters, value));
  }
  function open(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    window.history.pushState(null, "", `/admin/students/${id}?${studentFilterParams(filters)}`);
    setSelected(id);
  }
  function close() {
    window.history.pushState(null, "", studentListHref(filters));
    setSelected(null);
  }
  function refresh() {
    list.refetch();
    setVersion((v) => v + 1);
  }
  function searchFor(value: string) {
    setQ(value);
    if (filters.page !== 1) change({});
  }
  function clearFilters() {
    setQ("");
    setSearch("");
    navigate(readStudentFilters(new URLSearchParams("page=1")));
  }
  const hasFilters = Boolean(
    q ||
    filters.courseId ||
    filters.cohortId ||
    filters.pendienteCohorte ||
    filters.documentosPendientes ||
    filters.activo ||
    filters.incluirHistorial,
  );
  const summary = list.data?.cohortSummary;
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
            description="Consulta sus cuentas, cursos, cohortes y requisitos."
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
          {params.get("aviso") === "alumno-eliminado" && (
            <p role="status" className="text-status-success">
              El alumno se eliminó definitivamente.
            </p>
          )}
          <StudentFilters
            filters={filters}
            q={q}
            courses={courses.data ?? []}
            cohorts={cohorts.data ?? []}
            onSearch={searchFor}
            onChange={change}
            onClear={clearFilters}
          />
          {catalogError && (
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
          )}
          {!list.isLoading &&
            !list.error &&
            filters.cohortId &&
            summary?.id === filters.cohortId && (
              <section
                aria-label="Resumen de la cohorte"
                className="rounded-md border border-border bg-bg-surface p-4 text-sm text-text-primary"
              >
                <p className="font-medium">
                  Cohorte {summary.name}: {summary.activeStudents} alumnos activos (
                  {summary.usedCapacity}/{summary.totalCapacity} cupos)
                </p>
                {search && (
                  <p className="mt-1 text-text-secondary">
                    Mostrando {summary.matchingActiveStudents} de {summary.activeStudents} alumnos
                    activos
                  </p>
                )}
              </section>
            )}
          <StudentTable
            students={list.data?.items ?? []}
            cohorts={cohorts.data ?? []}
            filterQuery={studentFilterParams(filters).toString()}
            isLoading={list.isLoading}
            error={list.error}
            onRetry={list.refetch}
            filtered={hasFilters}
            onClear={clearFilters}
            onOpen={open}
          />
          {!list.isLoading && !list.error && (list.data?.total ?? 0) > 0 && (
            <StudentPagination
              total={list.data?.total ?? 0}
              page={filters.page}
              onChange={(page) => navigate({ ...filters, page })}
            />
          )}
        </div>
        <StudentDrawer id={selected} onClose={close} onChanged={refresh} />
      </div>
    </div>
  );
}
