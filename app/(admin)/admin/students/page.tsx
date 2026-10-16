"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, PageHeader, Pagination, buttonClassName } from "@/components/ui";
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

export function StudentsList() {
  const params = useSearchParams();
  const router = useRouter();
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
  function change(value: Partial<Filters>) {
    router.replace(studentListHref(changeStudentFilter(filters, value)), { scroll: false });
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
    <div className="flex min-w-0 flex-col gap-6">
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
              Matricular estudiante
            </Link>
          </>
        }
      />
      {params.get("aviso") === "alumno-eliminado" ? (
        <p role="status" className="text-status-success">
          El alumno se eliminó definitivamente.
        </p>
      ) : null}
      <StudentFilters
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
      />
      {!list.isLoading && !list.error && (list.data?.total ?? 0) > 0 ? (
        <>
          <Pagination
            total={list.data!.total}
            page={filters.page}
            pageSize={20}
            singular="alumno"
            plural="alumnos"
            onPageChange={(page) =>
              router.replace(studentListHref({ ...filters, page }), { scroll: false })
            }
          />
          <p className="text-xs text-text-secondary">
            Consulta los documentos pendientes en la ficha del alumno.
          </p>
        </>
      ) : null}
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
