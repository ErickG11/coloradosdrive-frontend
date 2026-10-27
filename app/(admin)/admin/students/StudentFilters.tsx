"use client";

import { useId, useState } from "react";
import styles from "./students.module.css";
import { Button, FilterChips, Select, buttonClassName, type FilterChip } from "@/components/ui";
import type { Course, Cohort } from "@/types";
import type { StudentFilters as Filters } from "@/lib/api/students";

export function StudentFilters({
  filters,
  q,
  courses,
  cohorts,
  onSearch,
  onChange,
  onClear,
}: {
  filters: Filters;
  q: string;
  courses: Course[];
  cohorts: Cohort[];
  onSearch: (value: string) => void;
  onChange: (value: Partial<Filters>) => void;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const available = cohorts.filter(
    (cohort) => !filters.courseId || cohort.courseId === filters.courseId,
  );
  // Atajos de los mismos filtros de la URL; los selects de «Más filtros» siguen
  // siendo la forma completa (incluido el valor «No»).
  const quick = [
    {
      id: "all",
      label: "Todos",
      selected: !filters.activo && !filters.pendienteCohorte && !filters.documentosPendientes,
    },
    { id: "active", label: "Activos", selected: filters.activo === "true" },
    { id: "inactive", label: "Desactivados", selected: filters.activo === "false" },
    {
      id: "cohort",
      label: "Pendientes de cohorte",
      selected: filters.pendienteCohorte === "true",
    },
    {
      id: "documents",
      label: "Documentos pendientes",
      selected: filters.documentosPendientes === "true",
    },
  ];
  function selectQuick(id: string) {
    if (id === "all") onChange({ activo: "", pendienteCohorte: "", documentosPendientes: "" });
    if (id === "active") onChange({ activo: filters.activo === "true" ? "" : "true" });
    if (id === "inactive") onChange({ activo: filters.activo === "false" ? "" : "false" });
    if (id === "cohort")
      onChange({ pendienteCohorte: filters.pendienteCohorte === "true" ? "" : "true" });
    if (id === "documents")
      onChange({ documentosPendientes: filters.documentosPendientes === "true" ? "" : "true" });
  }
  const yesNo = (value: string) => (value === "true" ? "Sí" : "No");
  const active: FilterChip[] = [];
  if (q.trim()) active.push({ id: "search", label: "Búsqueda" });
  if (filters.courseId)
    active.push({
      id: "courseId",
      label: courses.find((c) => c.id === filters.courseId)?.nombre ?? "Curso seleccionado",
    });
  if (filters.cohortId)
    active.push({
      id: "cohortId",
      label: cohorts.find((c) => c.id === filters.cohortId)?.nombre ?? "Cohorte seleccionada",
    });
  if (filters.activo)
    active.push({ id: "activo", label: filters.activo === "true" ? "Activos" : "Desactivados" });
  if (filters.pendienteCohorte)
    active.push({
      id: "pendienteCohorte",
      label: `Pendientes de cohorte: ${yesNo(filters.pendienteCohorte)}`,
    });
  if (filters.documentosPendientes)
    active.push({
      id: "documentosPendientes",
      label: `Documentos pendientes: ${yesNo(filters.documentosPendientes)}`,
    });
  if (filters.incluirHistorial)
    active.push({ id: "incluirHistorial", label: "Historial de matrículas" });
  function remove(id: string) {
    if (id === "search") onSearch("");
    else if (id === "incluirHistorial") onChange({ incluirHistorial: false });
    else onChange({ [id]: "" });
  }
  return (
    <section aria-label="Filtrar alumnos" className={styles.filters}>
      <FilterChips items={quick} onSelect={selectQuick} />
      <Button
        type="button"
        variant="secondary"
        className="self-start md:hidden"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
      >
        Curso y más filtros <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </Button>
      <div
        id={panelId}
        className={`gap-3 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end ${expanded ? "grid" : "hidden"}`}
      >
        <Select
          name="studentCourse"
          label="Curso"
          value={filters.courseId}
          onChange={(e) => {
            const courseId = e.target.value;
            const cohort = cohorts.find((item) => item.id === filters.cohortId);
            onChange({
              courseId,
              cohortId: courseId && cohort?.courseId !== courseId ? "" : filters.cohortId,
            });
          }}
        >
          <option value="">Todos los cursos</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.nombre} · Tipo {course.tipo}
            </option>
          ))}
        </Select>
        <Select
          name="studentCohort"
          label="Cohorte"
          value={filters.cohortId}
          onChange={(e) => onChange({ cohortId: e.target.value })}
        >
          <option value="">Todas las cohortes</option>
          {available.map((cohort) => (
            <option key={cohort.id} value={cohort.id}>
              {cohort.nombre}
            </option>
          ))}
        </Select>
        <details className="relative min-w-0">
          <summary
            className={buttonClassName("secondary", "md", "w-full cursor-pointer list-none")}
          >
            Más filtros
          </summary>
          <div className="relative z-20 mt-3 grid gap-4 rounded-md border border-border bg-bg-surface p-4 shadow-elevated md:absolute md:right-0 md:w-80">
            {(
              [
                ["pendienteCohorte", "Pendientes de cohorte"],
                ["documentosPendientes", "Documentos pendientes"],
                ["activo", "Estado de la cuenta"],
              ] as const
            ).map(([field, label]) => (
              <Select
                key={field}
                name={`student-${field}`}
                label={label}
                value={filters[field]}
                onChange={(e) => onChange({ [field]: e.target.value })}
              >
                <option value="">Todos</option>
                <option value="true">{field === "activo" ? "Activos" : "Sí"}</option>
                <option value="false">{field === "activo" ? "Desactivados" : "No"}</option>
              </Select>
            ))}
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                name="incluirHistorial"
                className="h-4 w-4 accent-brand-primary"
                checked={filters.incluirHistorial}
                onChange={(e) => onChange({ incluirHistorial: e.target.checked })}
              />
              Incluir historial de matrículas
            </label>
          </div>
        </details>
      </div>
      {active.length ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <FilterChips label="Filtros activos" items={active} removable onSelect={remove} />
          <button
            type="button"
            onClick={onClear}
            className="min-h-11 rounded-sm px-1 text-sm font-medium text-text-secondary underline underline-offset-4 hover:text-text-primary md:min-h-10"
          >
            Limpiar filtros
          </button>
        </div>
      ) : null}
    </section>
  );
}
