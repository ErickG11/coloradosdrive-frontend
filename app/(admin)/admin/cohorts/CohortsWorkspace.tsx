"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";

import { Button, FormError, IconButton, Select, buttonClassName } from "@/components/ui";
import { EditIcon, TrashIcon } from "@/components/ui/icons";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useFetch } from "@/hooks/useFetch";
import { formatMoney } from "@/lib/utils/money";
import type { Cohort, Course } from "@/types";

import { CohortCreator, CohortEditor } from "./CohortEditor";
import type { CohortSavedNotice } from "./CohortForm";
import { CohortMetricValue } from "./CohortMetricValue";
import { CohortIcon } from "./CohortVisual";
import { DeleteCohortModal } from "./DeleteCohortModal";
import { useCohortStudentCounts } from "./useCohortStudentCounts";
import styles from "./cohorts.module.css";

function courseLabel(course: Course | undefined): string {
  if (!course) {
    return "—";
  }
  return `${course.nombre} (Tipo ${course.tipo})`;
}

// Avisos tras crear o guardar: llegan por ?aviso=... (páginas completas) o
// desde el panel lateral.
const NOTICES: Record<CohortSavedNotice, string> = {
  "cohorte-creada": "Cohorte creada correctamente.",
  "cohorte-guardada": "Cambios guardados correctamente.",
};

// Región viva siempre montada: el texto se agrega después del montaje (así se
// anuncia). Se oculta mientras se abre o completa una eliminación.
function CohortNotice({ hidden, override }: { hidden: boolean; override: string | null }) {
  const params = useSearchParams();
  // Se lee una sola vez: el aviso sigue visible aunque luego se limpie la URL.
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const found = NOTICES[(params.get("aviso") ?? "") as CohortSavedNotice];
    if (!found) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotice(found);
    // Quita ?aviso de la URL (sin navegar) para que recargar o volver con
    // Atrás/Adelante no repita el aviso.
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [params]);

  return (
    <p role="status" className="text-sm text-accent-blue empty:hidden">
      {hidden ? "" : (override ?? notice)}
    </p>
  );
}

const dateFormat = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
function courseDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormat.format(parsed);
}
const todayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Guayaquil",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function schoolDay() {
  const parts = todayFormatter.formatToParts(new Date());
  return ["year", "month", "day"].map((key) => parts.find((p) => p.type === key)?.value).join("-");
}
type Period = "current" | "upcoming" | "finished" | "unknown";
function period(cohort: Cohort, today: string): Period {
  if (!cohort.fechaInicioCurso || !cohort.fechaFinCurso) return "unknown";
  if (cohort.fechaInicioCurso > today) return "upcoming";
  if (cohort.fechaFinCurso < today) return "finished";
  return "current";
}
const periodLabels: Record<Period, string> = {
  current: "En curso",
  upcoming: "Próxima",
  finished: "Finalizada",
  unknown: "Sin fechas",
};

// Panel como diálogo en pantallas angostas; tabla o tarjetas según el ancho.
function useMedia(query: string) {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const media = window.matchMedia(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => typeof window.matchMedia === "function" && window.matchMedia(query).matches,
    () => false,
  );
}

type Panel = "new" | string | null;

export function CohortsWorkspace() {
  const {
    data: cohorts,
    isLoading: isLoadingCohorts,
    error: cohortsError,
    refetch: refetchCohorts,
  } = useFetch<Cohort[]>("/cohorts");
  const {
    data: courses,
    isLoading: isLoadingCourses,
    error: coursesError,
    refetch: refetchCourses,
  } = useFetch<Course[]>("/courses");

  // Con datos ya cargados, un refetch no reemplaza la tabla por «Cargando…».
  const isLoading = (isLoadingCohorts && !cohorts) || (isLoadingCourses && !courses);
  const error = cohortsError ?? coursesError;
  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));
  const [toDelete, setToDelete] = useState<Cohort | null>(null);
  const [deletedMessage, setDeletedMessage] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  // Ids eliminados en esta pantalla: la fila desaparece al instante, sin
  // esperar a que vuelva la lista del servidor.
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const deletedRef = useRef<HTMLParagraphElement>(null);
  const existing = (cohorts ?? []).filter((cohort) => !removedIds.includes(cohort.id));

  // Al cerrar el modal el foco se pierde: pasa al mensaje de éxito.
  useEffect(() => {
    if (deletedMessage) deletedRef.current?.focus();
  }, [deletedMessage]);

  function handleDeleted(cohort: Cohort, message: string) {
    setToDelete(null);
    setRemovedIds((ids) => [...ids, cohort.id]);
    setDeletedMessage(message);
    refetchCohorts();
  }

  // El período depende de la fecha de la escuela; se calcula en el cliente.
  const [today, setToday] = useState("");
  useEffect(() => {
    const update = () => setToday(schoolDay());
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pagination, setPagination] = useState({ page: 1, size: 10 });
  const rangeRef = useRef<HTMLDetailsElement>(null);
  const normalize = (text: string) =>
    text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es");
  const search = normalize(query.trim());
  // Se conserva el orden en que el servidor entrega las cohortes.
  const filtered = existing.filter((cohort) => {
    const course = coursesById.get(cohort.courseId);
    return (
      (type === "all" || course?.tipo === type) &&
      (status === "all" || period(cohort, today) === status) &&
      (!from || cohort.fechaInicioCurso >= from) &&
      (!to || cohort.fechaInicioCurso <= to) &&
      normalize(`${cohort.nombre} ${courseLabel(course)}`).includes(search)
    );
  });
  const activeFilters = Boolean(query || type !== "all" || status !== "all" || from || to);
  function resetPage() {
    setPagination((current) => ({ ...current, page: 1 }));
  }
  function clearFilters() {
    resetPage();
    setQuery("");
    setType("all");
    setStatus("all");
    setFrom("");
    setTo("");
  }
  const pages = Math.max(1, Math.ceil(filtered.length / pagination.size));
  const page = Math.min(pagination.page, pages);
  const offset = (page - 1) * pagination.size;
  const pageCohorts = filtered.slice(offset, offset + pagination.size);
  const pageNumbers = Array.from(
    new Set([
      1,
      ...Array.from({ length: 5 }, (_, i) => page + i - 2).filter((n) => n > 1 && n < pages),
      pages,
    ]),
  ).sort((a, b) => a - b);

  // Matrículas por cohorte (GET /cohorts/:id); un fallo se muestra como «—».
  const studentCounts = useCohortStudentCounts(cohorts);
  const counts = {
    all: existing.length,
    current: existing.filter((c) => period(c, today) === "current").length,
    finished: existing.filter((c) => period(c, today) === "finished").length,
  };
  const currentCounts = existing
    .filter((c) => period(c, today) === "current")
    .map((c) => studentCounts[c.id]);
  const activeEnrollments = currentCounts.some((c) => c === undefined)
    ? undefined
    : currentCounts.some((c) => c === null)
      ? null
      : currentCounts.reduce((sum, c) => sum + (c?.activos ?? 0), 0);
  const typeA = existing.filter((c) => coursesById.get(c.courseId)?.tipo === "A").length;
  const typeB = existing.filter((c) => coursesById.get(c.courseId)?.tipo === "B").length;
  const metrics = [
    { key: "all", label: "Total de cohortes", icon: "layers" },
    { key: "current", label: "En curso", icon: "car" },
    { key: "students", label: "Matrículas activas en curso", icon: "students" },
    { key: "finished", label: "Finalizadas", icon: "graduation" },
  ] as const;

  // Panel lateral para crear o editar sin salir del listado. Las páginas
  // /admin/cohorts/new y /admin/cohorts/[id]/edit siguen funcionando solas.
  const [panel, setPanel] = useState<Panel>(null);
  const panelRef = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const mobilePanel = useMedia("(max-width: 1099px)");
  const mobileList = useMedia("(max-width: 767px)");
  const closePanel = useCallback(() => {
    setPanel(null);
    trigger.current?.focus();
  }, []);
  useDialogFocus(Boolean(panel && mobilePanel), panelRef, closePanel);
  useEffect(() => {
    if (!panel || mobilePanel) return;
    panelRef.current?.focus();
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        closePanel();
      }
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [panel, mobilePanel, closePanel]);
  function openPanel(event: MouseEvent<HTMLAnchorElement>, next: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    trigger.current = event.currentTarget;
    setDeletedMessage(null);
    setSavedNotice(null);
    setPanel(next);
  }
  function saved(notice: CohortSavedNotice) {
    setPanel(null);
    setDeletedMessage(null);
    setSavedNotice(NOTICES[notice]);
    refetchCohorts();
    trigger.current?.focus();
  }
  function askDelete(cohort: Cohort) {
    setPanel(null);
    setDeletedMessage(null);
    setToDelete(cohort);
  }

  function editLink(cohort: Cohort) {
    return (
      <Link
        href={`/admin/cohorts/${cohort.id}/edit`}
        onClick={(event) => openPanel(event, cohort.id)}
        className={styles.edit}
        aria-label={`Editar ${cohort.nombre}`}
        title={`Editar ${cohort.nombre}`}
      >
        <EditIcon className="h-4 w-4" />
      </Link>
    );
  }
  function deleteButton(cohort: Cohort) {
    return (
      <IconButton
        variant="danger"
        icon={<TrashIcon className="h-4 w-4" />}
        aria-label={`Eliminar ${cohort.nombre}`}
        onClick={() => askDelete(cohort)}
      />
    );
  }
  function courseCell(cohort: Cohort) {
    const course = coursesById.get(cohort.courseId);
    return (
      <div className={styles.courseIdentity}>
        {course ? (
          <span className={styles.courseIcon} data-course-type={course.tipo}>
            <CohortIcon name={course.tipo === "A" ? "motorcycle" : "car"} />
          </span>
        ) : null}
        <span>{courseLabel(course)}</span>
      </div>
    );
  }
  function statusBadge(cohort: Cohort) {
    const key = period(cohort, today);
    return (
      <span className={styles.status} data-status={key}>
        <span aria-hidden="true" />
        {today ? periodLabels[key] : "—"}
      </span>
    );
  }
  function studentCount(cohort: Cohort) {
    const detail = studentCounts[cohort.id];
    const count = detail?.activos;
    const ratio = count === undefined || cohort.cupoMaximo <= 0 ? null : count / cohort.cupoMaximo;
    const level =
      ratio === null ? "unknown" : ratio >= 0.8 ? "high" : ratio >= 0.5 ? "medium" : "low";
    return (
      <div className={styles.studentCount} data-occupancy={level}>
        <span className={styles.studentCountValue}>
          <CohortIcon name="students" />
          {detail === null ? "—" : count === undefined ? "…" : count}
          <span>{count === 1 ? "activo" : "activos"}</span>
        </span>
        {ratio !== null ? (
          <div
            className={styles.capacityTrack}
            role="meter"
            aria-label={`Ocupación de ${cohort.nombre}`}
            aria-valuemin={0}
            aria-valuemax={Math.max(cohort.cupoMaximo, count ?? 0)}
            aria-valuenow={count}
            aria-valuetext={`${count} matrículas activas de ${cohort.cupoMaximo} cupos`}
          >
            <span style={{ width: `${Math.min(100, ratio * 100)}%` }} />
          </div>
        ) : null}
        <small>{detail === null ? "Sin conteo de alumnos" : `de ${cohort.cupoMaximo} cupos`}</small>
        {detail && detail.total !== detail.activos ? (
          <small>{detail.total} en el historial</small>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${panel ? styles.panelOpen : ""}`}>
      <div className={styles.workspace}>
        <div className={styles.mainRegion}>
          <header className={styles.pageHeader}>
            <div>
              <h1>Cohortes</h1>
              <p>Gestiona y organiza las cohortes de tus cursos.</p>
            </div>
            <div className={styles.headerActions}>
              <Button
                variant="secondary"
                disabled={isLoading}
                onClick={() => {
                  refetchCohorts();
                  refetchCourses();
                }}
                aria-label="Actualizar estadísticas y cohortes"
              >
                <CohortIcon name="refresh" />
                Actualizar
              </Button>
              <Link
                href="/admin/cohorts/new"
                onClick={(event) => openPanel(event, "new")}
                className={buttonClassName("primary", "md", styles.primary)}
              >
                <CohortIcon name="plus" />
                Nueva cohorte
              </Link>
            </div>
          </header>

          <Suspense fallback={null}>
            <CohortNotice
              hidden={toDelete !== null || deletedMessage !== null}
              override={savedNotice}
            />
          </Suspense>
          {/* Región viva siempre montada: solo cambia su texto. */}
          <p
            ref={deletedRef}
            role="status"
            tabIndex={-1}
            className="text-sm text-accent-blue outline-none empty:hidden"
          >
            {deletedMessage}
          </p>

          <section className={styles.summary} aria-label="Resumen de cohortes">
            {metrics.map(({ key, label, icon }) => {
              const value =
                isLoading || !today
                  ? undefined
                  : error
                    ? null
                    : key === "students"
                      ? activeEnrollments
                      : counts[key];
              return (
                <div key={key} className={styles.summaryItem} data-metric={key}>
                  <span className={styles.summaryIcon}>
                    <CohortIcon name={icon} />
                  </span>
                  <div>
                    <strong>
                      <CohortMetricValue value={value} />
                    </strong>
                    <span>{label}</span>
                    <small>
                      {value === undefined
                        ? "Actualizando…"
                        : value === null
                          ? "Sin datos"
                          : key === "all"
                            ? `${typeA} Tipo A · ${typeB} Tipo B`
                            : key === "students"
                              ? "Suma de las cohortes en curso"
                              : counts.all
                                ? `${Math.round((counts[key] / counts.all) * 100)} % del total`
                                : "Sin cohortes registradas"}
                    </small>
                  </div>
                </div>
              );
            })}
          </section>

          <div className={styles.filters} aria-label="Filtros de cohortes" role="group">
            <div className={styles.search}>
              <CohortIcon name="search" />
              <label className="sr-only" htmlFor="cohort-search">
                Buscar por nombre o curso
              </label>
              <input
                id="cohort-search"
                name="cohort-search"
                autoComplete="off"
                type="search"
                placeholder="Buscar por nombre, curso…"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  resetPage();
                }}
                disabled={isLoading || Boolean(error)}
              />
            </div>
            <Select
              label="Curso"
              name="course-filter"
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                resetPage();
              }}
              disabled={isLoading || Boolean(error)}
            >
              <option value="all">Todos</option>
              <option value="B">Tipo B</option>
              <option value="A">Tipo A</option>
            </Select>
            <Select
              label="Período"
              name="period-filter"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                resetPage();
              }}
              disabled={isLoading || Boolean(error) || !today}
            >
              <option value="all">Todos</option>
              <option value="current">En curso</option>
              <option value="upcoming">Próximas</option>
              <option value="finished">Finalizadas</option>
            </Select>
            <div className={styles.dateFilter}>
              <span id="date-filter-label">Inicio del curso</span>
              <details ref={rangeRef}>
                <summary
                  aria-labelledby="date-filter-label"
                  className={from || to ? styles.rangeActive : ""}
                >
                  <span>{from || to ? "Rango aplicado" : "Seleccionar rango"}</span>
                  <CohortIcon name="calendar" />
                </summary>
                <div className={styles.rangePopover}>
                  <label htmlFor="cohort-from">Desde</label>
                  <input
                    type="date"
                    id="cohort-from"
                    value={from}
                    onChange={(event) => {
                      setFrom(event.target.value);
                      resetPage();
                    }}
                  />
                  <label htmlFor="cohort-to">Hasta</label>
                  <input
                    type="date"
                    id="cohort-to"
                    value={to}
                    onChange={(event) => {
                      setTo(event.target.value);
                      resetPage();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (rangeRef.current) rangeRef.current.open = false;
                    }}
                  >
                    Listo
                  </button>
                </div>
              </details>
            </div>
            <button
              type="button"
              className={styles.reset}
              onClick={clearFilters}
              disabled={!activeFilters}
            >
              <CohortIcon name="refresh" />
              Limpiar
            </button>
          </div>

          <section className={styles.list} aria-label="Listado de cohortes">
            {isLoading ? (
              <div className={styles.loading} role="status">
                <span>Cargando…</span>
                <div />
                <div />
                <div />
              </div>
            ) : error ? (
              <div className={styles.empty}>
                <FormError>{error}</FormError>
                <Button
                  variant="secondary"
                  onClick={() => {
                    refetchCohorts();
                    refetchCourses();
                  }}
                >
                  Volver a intentar
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles.empty}>
                <CohortIcon name="layers" />
                <h2>
                  {existing.length ? "No encontramos coincidencias" : "Todavía no hay cohortes."}
                </h2>
                <p>
                  {existing.length
                    ? "Prueba con otro nombre o cambia los filtros."
                    : "Crea una cohorte para definir el curso, el precio y sus fechas."}
                </p>
                {activeFilters ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                ) : (
                  <Link
                    href="/admin/cohorts/new"
                    onClick={(event) => openPanel(event, "new")}
                    className={buttonClassName()}
                  >
                    Nueva cohorte
                  </Link>
                )}
              </div>
            ) : mobileList ? (
              <ul className={styles.mobileList}>
                {pageCohorts.map((cohort) => (
                  <li key={cohort.id}>
                    <header>
                      <h2>{cohort.nombre}</h2>
                      <div className="flex items-center gap-1">
                        {editLink(cohort)}
                        {deleteButton(cohort)}
                      </div>
                    </header>
                    {courseCell(cohort)}
                    <dl>
                      <div>
                        <dt>Precio</dt>
                        <dd>{formatMoney(cohort.precio)}</dd>
                      </div>
                      <div>
                        <dt>Alumnos en la cohorte</dt>
                        <dd>{studentCount(cohort)}</dd>
                      </div>
                      <div>
                        <dt>Fechas del curso</dt>
                        <dd>
                          {courseDate(cohort.fechaInicioCurso)} — {courseDate(cohort.fechaFinCurso)}
                        </dd>
                      </div>
                      <div>
                        <dt>Creada</dt>
                        <dd>{new Date(cohort.createdAt).toLocaleDateString("es-EC")}</dd>
                      </div>
                      <div>
                        <dt>Período</dt>
                        <dd>{statusBadge(cohort)}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            ) : (
              <div
                className={styles.tableWrap}
                role="region"
                aria-label="Tabla de cohortes, desplazamiento horizontal disponible"
                tabIndex={0}
              >
                <table className={styles.table}>
                  <caption className="sr-only">
                    Listado de cohortes. El período se calcula según las fechas del curso; no indica
                    disponibilidad de matrícula.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Cohorte</th>
                      <th scope="col">Curso</th>
                      <th scope="col">Alumnos</th>
                      <th scope="col">Precio</th>
                      <th scope="col">Fechas</th>
                      <th scope="col">Período</th>
                      <th scope="col">Creada</th>
                      <th scope="col">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageCohorts.map((cohort) => (
                      <tr key={cohort.id}>
                        <td>
                          <div className={styles.cohortName}>
                            <span
                              className={styles.rowDot}
                              data-status={period(cohort, today)}
                              aria-hidden="true"
                            />
                            <strong>{cohort.nombre}</strong>
                          </div>
                        </td>
                        <td>{courseCell(cohort)}</td>
                        <td className={styles.numeric}>{studentCount(cohort)}</td>
                        <td className={styles.numeric}>{formatMoney(cohort.precio)}</td>
                        <td>
                          <div className={styles.dateCell}>
                            <CohortIcon name="calendar" />
                            <div>
                              <span>{courseDate(cohort.fechaInicioCurso)}</span>
                              <small>al {courseDate(cohort.fechaFinCurso)}</small>
                            </div>
                          </div>
                        </td>
                        <td>{statusBadge(cohort)}</td>
                        <td>{new Date(cohort.createdAt).toLocaleDateString("es-EC")}</td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            {editLink(cohort)}
                            {deleteButton(cohort)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!isLoading && !error && filtered.length > 0 ? (
              <footer className={styles.listFooter}>
                <span>
                  Mostrando {offset + 1}–{Math.min(offset + pagination.size, filtered.length)} de{" "}
                  {filtered.length} cohortes
                </span>
                <nav className={styles.pagination} aria-label="Páginas de cohortes">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPagination((current) => ({ ...current, page: page - 1 }))}
                    aria-label="Página anterior"
                  >
                    <CohortIcon name="back" />
                  </button>
                  {pageNumbers.map((n, i) => (
                    <span key={n}>
                      {i > 0 && n > pageNumbers[i - 1] + 1 ? (
                        <span className={styles.pageGap}>…</span>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Página ${n}`}
                        aria-current={page === n ? "page" : undefined}
                        onClick={() => setPagination((current) => ({ ...current, page: n }))}
                      >
                        {n}
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    disabled={page === pages}
                    onClick={() => setPagination((current) => ({ ...current, page: page + 1 }))}
                    aria-label="Página siguiente"
                  >
                    <span className={styles.nextArrow}>
                      <CohortIcon name="back" />
                    </span>
                  </button>
                </nav>
                <label className={styles.pageSize}>
                  Filas por página
                  <select
                    value={pagination.size}
                    onChange={(event) =>
                      setPagination({ page: 1, size: Number(event.target.value) })
                    }
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </label>
              </footer>
            ) : null}
          </section>
        </div>
        {panel ? (
          <aside
            ref={panelRef}
            tabIndex={-1}
            className={styles.sidePanel}
            role={mobilePanel ? "dialog" : "region"}
            aria-modal={mobilePanel || undefined}
            aria-labelledby="cohort-panel-title"
          >
            <header className={styles.panelHeader}>
              <div>
                <h2 id="cohort-panel-title">
                  {panel === "new" ? "Nueva cohorte" : "Editar cohorte"}
                </h2>
                <p>
                  {panel === "new"
                    ? "Completa la información para crear una nueva cohorte."
                    : "Actualiza la información de esta cohorte."}
                </p>
              </div>
              <button type="button" onClick={closePanel} aria-label="Cerrar panel">
                <CohortIcon name="close" />
              </button>
            </header>
            <div className={styles.panelBody}>
              {panel === "new" ? (
                <CohortCreator onSaved={saved} onCancel={closePanel} />
              ) : (
                <CohortEditor key={panel} id={panel} onSaved={saved} onCancel={closePanel} />
              )}
            </div>
          </aside>
        ) : null}
      </div>

      {toDelete ? (
        <DeleteCohortModal
          cohort={toDelete}
          courseLabel={courseLabel(coursesById.get(toDelete.courseId))}
          onClose={() => setToDelete(null)}
          onDeleted={(message) => handleDeleted(toDelete, message)}
          onGone={refetchCohorts}
        />
      ) : null}
    </div>
  );
}
