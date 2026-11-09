"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LearningProgress } from "@/components/learning/LearningProgress";
import type { Exam } from "@/types/exam";
import type { CohortProgress, ExamResult } from "@/types/content";
import { contentDate, safeProgress } from "@/lib/utils/content";
import { AdminChip, AdminEmpty, AdminMetric } from "./AdminContentUI";
import styles from "./admin-content.module.css";

const ResultsChart = dynamic(() => import("./ResultsChart"), {
  ssr: false,
  loading: () => <p role="status">Cargando gráfico…</p>,
});
const ProgressChart = dynamic(() => import("./ProgressChart"), {
  ssr: false,
  loading: () => <p role="status">Cargando gráfico…</p>,
});

export function ExamResultsView({
  rows,
  exam,
  names,
  onExtra,
  reload,
}: {
  rows: ExamResult[];
  exam: Exam;
  names: Map<string, string>;
  onExtra: (exam: Exam, student: string, used: number) => void;
  reload: () => void;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: "name" | "score" | "attempts" | "status"; asc: boolean }>(
    { key: "name", asc: true },
  );
  const completed = rows
    .flatMap((row) => row.intentos)
    .filter((attempt) => attempt.status === "completado" && attempt.score_percent !== null);
  const scores = completed.map((attempt) => Number(attempt.score_percent));
  const approved = completed.filter((attempt) => attempt.passed).length;
  const average = scores.length ? scores.reduce((sum, n) => sum + n, 0) / scores.length : null;
  const best = scores.length ? Math.max(...scores) : null;
  const state = (row: ExamResult) =>
    row.intentos.some((attempt) => attempt.passed)
      ? "Aprobado"
      : row.intentos.some((attempt) => attempt.status === "en_progreso")
        ? "En progreso"
        : row.intentos.some((attempt) => attempt.status === "completado")
          ? "Reprobado"
          : "Sin intentos";
  const visible = rows
    .filter((row) =>
      (names.get(row.student_id) ?? "Alumno no disponible")
        .toLocaleLowerCase("es")
        .includes(search.trim().toLocaleLowerCase("es")),
    )
    .toSorted((a, b) => {
      const left =
        sort.key === "name"
          ? (names.get(a.student_id) ?? "")
          : sort.key === "status"
            ? state(a)
            : sort.key === "score"
              ? Number(a.mejor_nota ?? -1)
              : a.intentos_usados;
      const right =
        sort.key === "name"
          ? (names.get(b.student_id) ?? "")
          : sort.key === "status"
            ? state(b)
            : sort.key === "score"
              ? Number(b.mejor_nota ?? -1)
              : b.intentos_usados;
      return (
        (typeof left === "string"
          ? left.localeCompare(String(right), "es")
          : left - Number(right)) * (sort.asc ? 1 : -1)
      );
    });
  const ranges = ["0–25", "25–50", "50–75", "75–100"].map((range, index) => ({
    range,
    count: scores.filter((score) =>
      index === 0
        ? score <= 25
        : index === 1
          ? score > 25 && score <= 50
          : index === 2
            ? score > 50 && score <= 75
            : score > 75,
    ).length,
  }));
  const format = (value: number | null) =>
    value === null ? "—" : `${value.toLocaleString("es-EC", { maximumFractionDigits: 2 })}%`;
  const headings = [
    { key: "name", label: "Alumno" },
    { key: "attempts", label: "Intentos" },
    { key: "score", label: "Mejor nota" },
    { key: "status", label: "Estado" },
  ] as const;
  return (
    <>
      <div className={styles.metrics}>
        <AdminMetric
          label="Intentos registrados"
          value={rows.reduce((sum, row) => sum + row.intentos_usados, 0)}
          detail={`${completed.length} completados`}
          icon="examen"
        />
        <AdminMetric
          label="Promedio de notas"
          value={format(average)}
          detail="Intentos completados con nota"
          icon="stats"
        />
        <AdminMetric
          label="Tasa de aprobación"
          value={format(completed.length ? (approved / completed.length) * 100 : null)}
          detail="Sobre intentos completados"
          icon="check"
        />
        <AdminMetric
          label="Mejor nota"
          value={format(best)}
          detail="Máxima nota entre intentos"
          icon="stats"
        />
      </div>
      <section className={styles.chartSurface}>
        <h3>Distribución de notas</h3>
        {completed.length ? (
          <>
            <ResultsChart data={ranges} />
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-text-secondary">
              {ranges.map((range) => (
                <li key={range.range}>
                  {range.range}%: <strong className="text-text-primary">{range.count}</strong>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className={styles.help}>
            La distribución aparecerá cuando haya intentos completados con nota.
          </p>
        )}
      </section>
      <div className={styles.tableWrap}>
        <div className={styles.tableToolbar}>
          <h3>
            Resultados por alumno{" "}
            <span className="font-normal text-text-secondary">· {visible.length}</span>
          </h3>
          <Input
            label="Buscar alumno"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <p className="px-5 py-3 text-xs text-text-secondary sm:hidden">
          Desliza la tabla para ver todos los datos →
        </p>
        <table className={`${styles.table} ${styles.resultTable}`}>
          <caption className="sr-only">Resultados de {exam.title}</caption>
          <thead>
            <tr>
              {headings.map((heading) => (
                <th
                  key={heading.key}
                  aria-sort={
                    sort.key === heading.key ? (sort.asc ? "ascending" : "descending") : undefined
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSort({
                        key: heading.key,
                        asc: sort.key === heading.key ? !sort.asc : true,
                      })
                    }
                  >
                    {heading.label}
                    <span aria-hidden="true">
                      {sort.key === heading.key ? (sort.asc ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </th>
              ))}
              <th>Detalle y ampliación</th>
            </tr>
          </thead>
          <tbody>
            {visible.length ? (
              visible.map((row) => (
                <tr key={row.student_id}>
                  <td>
                    <strong>
                      <span aria-hidden="true" className={styles.avatar}>
                        {(names.get(row.student_id) ?? "A")
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")}
                      </span>
                      {names.get(row.student_id) ?? "Alumno no disponible"}
                    </strong>
                  </td>
                  <td>
                    {row.intentos_usados}{" "}
                    <span className="text-text-secondary">/ {row.intentos_permitidos ?? "∞"}</span>
                  </td>
                  <td>
                    <strong>
                      {row.mejor_nota === null
                        ? "Sin nota"
                        : `${Number(row.mejor_nota).toLocaleString("es-EC", { maximumFractionDigits: 2 })}%`}
                    </strong>
                  </td>
                  <td>
                    <AdminChip
                      tone={
                        state(row) === "Aprobado"
                          ? "success"
                          : state(row) === "Reprobado"
                            ? "error"
                            : state(row) === "En progreso"
                              ? "info"
                              : "neutral"
                      }
                    >
                      {state(row)}
                    </AdminChip>
                  </td>
                  <td>
                    <details>
                      <summary>
                        Ver {row.intentos.length}{" "}
                        {row.intentos.length === 1 ? "intento" : "intentos"}
                      </summary>
                      <ul>
                        {row.intentos.map((attempt) => (
                          <li key={attempt.id} className={styles.attempt}>
                            <strong>
                              Intento {attempt.attempt_number} ·{" "}
                              {attempt.status === "en_progreso"
                                ? "En progreso"
                                : attempt.passed
                                  ? "Aprobado"
                                  : "Reprobado"}
                            </strong>
                            <p>
                              {attempt.score_percent === null
                                ? "Sin nota"
                                : `${Number(attempt.score_percent).toLocaleString("es-EC", { maximumFractionDigits: 2 })}%`}
                            </p>
                            <p>Inicio: {contentDate(attempt.started_at)}</p>
                            <p>Plazo: {contentDate(attempt.deadline_at)}</p>
                          </li>
                        ))}
                      </ul>
                    </details>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={
                        row.intentos_usados >= 20 ||
                        row.intentos_permitidos === null ||
                        row.intentos_usados < row.intentos_permitidos ||
                        (exam.type === "definitivo" &&
                          row.intentos.some((attempt) => attempt.passed))
                      }
                      onClick={() => onExtra(exam, row.student_id, row.intentos_usados)}
                    >
                      Dar intento extra
                    </Button>
                    <p className={styles.help}>
                      {row.intentos_usados >= 20
                        ? "El máximo por regla es 20."
                        : exam.type === "definitivo" &&
                            row.intentos.some((attempt) => attempt.passed)
                          ? "Definitivo aprobado: no se repite."
                          : row.intentos_permitidos === null
                            ? "Intentos ilimitados: no necesita ampliación."
                            : row.intentos_usados < row.intentos_permitidos
                              ? "Aún tiene intentos disponibles."
                              : ""}
                    </p>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <AdminEmpty
                    title="No hay alumnos que coincidan"
                    actions={
                      <Button variant="secondary" onClick={() => setSearch("")}>
                        Limpiar búsqueda
                      </Button>
                    }
                  >
                    Prueba otro nombre para consultar sus resultados.
                  </AdminEmpty>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={reload}>
          Actualizar resultados
        </Button>
      </div>
    </>
  );
}

export function CohortProgressView({
  data,
  onStudent,
  reload,
}: {
  data: CohortProgress;
  onStudent: (id: string) => void;
  reload: () => void;
}) {
  const [search, setSearch] = useState("");
  const visible = data.students.filter((student) =>
    student.nombre_completo.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")),
  );
  const complete = data.students.filter((student) => student.completa).length;
  return (
    <>
      <div className={styles.metrics}>
        <AdminMetric label="Alumnos de la cohorte" value={data.students.length} icon="users" />
        <AdminMetric
          label="Promedio del curso"
          value={`${safeProgress(data.promedio_global, data.students.length > 0 && data.students.every((student) => student.completa)).toLocaleString("es-EC", { maximumFractionDigits: 2 })}%`}
          icon="stats"
        />
        <AdminMetric
          label="Curso completo"
          value={complete}
          detail="Completitud confirmada por servidor"
          icon="check"
        />
        <AdminMetric label="En aprendizaje" value={data.students.length - complete} icon="ruta" />
      </div>
      <section className={styles.chartSurface}>
        <h3>Avance de la cohorte</h3>
        <ProgressChart ranges={data.rangos} />
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-text-secondary">
          {(["0-25", "26-50", "51-75", "76-99", "100"] as const).map((range) => (
            <li key={range}>
              {range}%: <strong className="text-text-primary">{data.rangos[range] ?? 0}</strong>{" "}
              {(data.rangos[range] ?? 0) === 1 ? "alumno" : "alumnos"}
            </li>
          ))}
        </ul>
      </section>
      <div className={styles.tableWrap}>
        <div className={styles.tableToolbar}>
          <h3>Avance por alumno</h3>
          <Input
            label="Buscar alumno"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <p className="px-5 py-3 text-xs text-text-secondary sm:hidden">
          Desliza la tabla para ver todos los datos →
        </p>
        <table className={styles.table}>
          <caption className="sr-only">Progreso de los alumnos de la cohorte</caption>
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Progreso académico</th>
              <th>Estado del curso</th>
              <th>Materias y certificado</th>
            </tr>
          </thead>
          <tbody>
            {visible.length ? (
              visible.map((student) => (
                <tr key={student.student_id}>
                  <td>
                    <strong>{student.nombre_completo}</strong>
                  </td>
                  <td className="min-w-56">
                    <LearningProgress
                      label={student.nombre_completo}
                      value={student.global}
                      complete={student.completa}
                    />
                  </td>
                  <td>
                    <AdminChip tone={student.completa ? "success" : "info"}>
                      {student.completa ? "Curso completo" : "En aprendizaje"}
                    </AdminChip>
                  </td>
                  <td>
                    <Button size="sm" variant="ghost" onClick={() => onStudent(student.student_id)}>
                      Ver detalle →
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>No hay alumnos que coincidan con la búsqueda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className={`${styles.help} mt-3`}>
        El detalle del alumno muestra sus materias completas y confirma si el certificado está
        listo.
      </p>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={reload}>
          Actualizar progreso
        </Button>
      </div>
    </>
  );
}
