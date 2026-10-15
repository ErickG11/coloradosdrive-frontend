import { Input, Select } from "@/components/ui";
import type { Course, Cohort } from "@/types";
import type { StudentFilters as Filters } from "@/lib/api/students";

export function StudentFilters({
  filters,
  q,
  courses,
  cohorts,
  onSearch,
  onChange,
}: {
  filters: Filters;
  q: string;
  courses: Course[];
  cohorts: Cohort[];
  onSearch: (value: string) => void;
  onChange: (value: Partial<Filters>) => void;
}) {
  const available = cohorts.filter(
    (cohort) => !filters.courseId || cohort.courseId === filters.courseId,
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Input
        name="studentSearch"
        label="Buscar por nombre, cédula o teléfono"
        maxLength={80}
        value={q}
        onChange={(e) => onSearch(e.target.value)}
      />
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
      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          className="h-4 w-4 accent-accent-blue focus-visible:outline-2 focus-visible:outline-accent-blue"
          checked={filters.incluirHistorial}
          onChange={(e) => onChange({ incluirHistorial: e.target.checked })}
        />
        Incluir historial de matrículas
      </label>
    </div>
  );
}
