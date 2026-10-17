"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card } from "@/components/ui";
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
  // useFetch's effect cleanup ignores responses belonging to older paths.
  const list = useFetch<StudentList>(
    `/admin/estudiantes?${buildStudentListQuery(filters, search)}`,
  );
  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / 20));
  function change(value: Partial<Filters>) {
    router.replace(studentListHref(changeStudentFilter(filters, value)), { scroll: false });
  }
  const catalogError = courses.error || cohorts.error;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-text-primary">Alumnos</h1>
      <Card>
        <StudentFilters
          filters={filters}
          q={q}
          courses={courses.data ?? []}
          cohorts={cohorts.data ?? []}
          onSearch={(value) => {
            setQ(value);
            if (filters.page !== 1) change({});
          }}
          onChange={change}
        />
      </Card>
      {catalogError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-accent-red">
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
      {list.isLoading ? (
        <p role="status" className="text-text-secondary">
          Cargando alumnos…
        </p>
      ) : list.error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-accent-red">
          <span>{list.error}</span>
          <Button variant="secondary" onClick={list.refetch}>
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          <StudentTable
            students={list.data?.items ?? []}
            cohorts={cohorts.data ?? []}
            filterQuery={studentFilterParams(filters).toString()}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
            <span>
              {list.data?.total ?? 0} alumnos · Página {filters.page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() =>
                  router.replace(studentListHref({ ...filters, page: filters.page - 1 }), {
                    scroll: false,
                  })
                }
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={filters.page >= totalPages}
                onClick={() =>
                  router.replace(studentListHref({ ...filters, page: filters.page + 1 }), {
                    scroll: false,
                  })
                }
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
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
