"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import { Button, Select, buttonClassName } from "@/components/ui";
import { EditIcon } from "@/components/ui/icons";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useFetch } from "@/hooks/useFetch";
import type { Cohort, Course } from "@/types";
import { CohortForm, type CohortFormValues } from "./CohortForm";
import { CohortIcon, CourseIdentity } from "./CohortVisual";
import styles from "./cohorts.module.css";

const money = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "short", year: "numeric" });
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
function formatDate(value: string, civil = false) {
  const parsed = new Date(civil ? `${value}T12:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? "—" : date.format(parsed);
}
function period(cohort: Cohort, today: string) {
  if (!cohort.fechaInicioCurso || !cohort.fechaFinCurso) return "unknown";
  if (cohort.fechaInicioCurso > today) return "upcoming";
  if (cohort.fechaFinCurso < today) return "finished";
  return "current";
}
const periodLabels = {
  current: "En curso",
  upcoming: "Próxima",
  finished: "Finalizada",
  unknown: "Sin fechas",
};
function initialValues(cohort: Cohort): CohortFormValues {
  return {
    courseId: cohort.courseId,
    nombre: cohort.nombre,
    precio: String(cohort.precio),
    cupoMaximo: String(cohort.cupoMaximo),
    fechaInicioMatricula: cohort.fechaInicioMatricula,
    fechaFinMatricula: cohort.fechaFinMatricula,
    fechaInicioCurso: cohort.fechaInicioCurso,
    fechaFinCurso: cohort.fechaFinCurso,
    tipoModalidad: cohort.tipoModalidad ?? "",
    horariosCapacitacionTeoria: cohort.horariosCapacitacionTeoria ?? "",
    numeroVehiculos: cohort.numeroVehiculos === null ? "" : String(cohort.numeroVehiculos),
    numeroAulas: cohort.numeroAulas === null ? "" : String(cohort.numeroAulas),
  };
}
const mediaQuery = "(max-width: 1099px)";
function subscribeMobile(callback: () => void) {
  const media = window.matchMedia(mediaQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function getMobile() {
  return window.matchMedia(mediaQuery).matches;
}

export function CohortsWorkspace({ initialPanel = null }: { initialPanel?: string | null }) {
  const {
    data: cohorts,
    isLoading: loadingCohorts,
    error: cohortsError,
    refetch: reloadCohorts,
  } = useFetch<Cohort[]>("/cohorts");
  const {
    data: courses,
    isLoading: loadingCourses,
    error: coursesError,
    refetch: reloadCourses,
  } = useFetch<Course[]>("/courses");
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [panel, setPanel] = useState(initialPanel);
  const [today, setToday] = useState("");
  useEffect(() => {
    const update = () => setToday(schoolDay());
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);
  const panelRef = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const rangeRef = useRef<HTMLDetailsElement>(null);
  const mobile = useSyncExternalStore(subscribeMobile, getMobile, () => false);
  const closePanel = useCallback(() => {
    setPanel(null);
    if (pathname !== "/admin/cohorts") router.replace("/admin/cohorts");
    else trigger.current?.focus();
  }, [pathname, router]);
  useDialogFocus(Boolean(panel && mobile), panelRef, closePanel);
  useEffect(() => {
    if (!panel || mobile) return;
    panelRef.current?.focus();
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        closePanel();
      }
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [panel, mobile, closePanel]);
  const isLoading = loadingCohorts || loadingCourses;
  const error = cohortsError ?? coursesError;
  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  const search = normalize(query.trim());
  const filtered = (cohorts ?? []).filter((cohort) => {
    const course = coursesById.get(cohort.courseId);
    return (
      (type === "all" || course?.tipo === type) &&
      (status === "all" || period(cohort, today) === status) &&
      (!from || cohort.fechaInicioCurso >= from) &&
      (!to || cohort.fechaInicioCurso <= to) &&
      normalize(
        `${cohort.nombre} ${course?.nombre ?? ""} ${course?.tipo ?? ""} ${cohort.fechaInicioCurso} ${cohort.fechaFinCurso}`,
      ).includes(search)
    );
  });
  const counts = {
    all: cohorts?.length ?? 0,
    current: (cohorts ?? []).filter((c) => period(c, today) === "current").length,
    upcoming: (cohorts ?? []).filter((c) => period(c, today) === "upcoming").length,
    finished: (cohorts ?? []).filter((c) => period(c, today) === "finished").length,
  };
  const selected = cohorts?.find((cohort) => cohort.id === panel);
  function openPanel(event: MouseEvent<HTMLAnchorElement>, next: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    trigger.current = event.currentTarget;
    setPanel(next);
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
  function statusBadge(cohort: Cohort) {
    const key = period(cohort, today);
    return (
      <span className={styles.status} data-status={key}>
        <span aria-hidden="true" />
        {today ? periodLabels[key] : "—"}
      </span>
    );
  }
  function clear() {
    setQuery("");
    setType("all");
    setStatus("all");
    setFrom("");
    setTo("");
  }
  function saved() {
    reloadCohorts();
    closePanel();
  }
  const metrics = [
    { key: "all", label: "Total de cohortes", icon: "layers" },
    { key: "current", label: "En curso", icon: "students" },
    { key: "upcoming", label: "Próximas", icon: "calendar" },
    { key: "finished", label: "Finalizadas", icon: "graduation" },
  ] as const;
  const activeFilters = Boolean(query || type !== "all" || status !== "all" || from || to);
  return (
    <div className={`${styles.page} ${panel ? styles.panelOpen : ""}`}>
      <div className={styles.topbar}>
        <div className={styles.topSearch}>
          <CohortIcon name="search" />
          <label className="sr-only" htmlFor="cohort-global-search">
            Buscar cohortes, cursos o fechas
          </label>
          <input
            id="cohort-global-search"
            name="cohort-global-search"
            type="search"
            autoComplete="off"
            placeholder="Buscar cohortes, cursos, fechas…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className={styles.identity}>
          <span aria-hidden="true">CD</span>
          <div>
            <strong>Administrador</strong>
            <small>Colorados Drive</small>
          </div>
        </div>
      </div>
      <div className={styles.workspace}>
        <div className={styles.mainRegion}>
          <header className={styles.pageHeader}>
            <div>
              <h1>Cohortes</h1>
              <p>Gestiona y organiza las cohortes de tus cursos.</p>
            </div>
            <Link
              href="/admin/cohorts/new"
              onClick={(event) => openPanel(event, "new")}
              className={buttonClassName("primary", "md", styles.primary)}
            >
              <CohortIcon name="plus" />
              Nueva cohorte
            </Link>
          </header>
          <section className={styles.summary} aria-label="Resumen de cohortes">
            {metrics.map(({ key, label, icon }) => (
              <div key={key} className={styles.summaryItem}>
                <span className={styles.summaryIcon}>
                  <CohortIcon name={icon} />
                </span>
                <div>
                  <strong>{isLoading || error || !today ? "—" : counts[key]}</strong>
                  <span>{label}</span>
                  <small>{key === "all" ? "Registradas" : "Por fechas del curso"}</small>
                </div>
              </div>
            ))}
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
                onChange={(event) => setQuery(event.target.value)}
                disabled={isLoading || Boolean(error)}
              />
            </div>
            <Select
              label="Curso"
              name="course-filter"
              value={type}
              onChange={(event) => setType(event.target.value)}
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
              onChange={(event) => setStatus(event.target.value)}
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
                    onChange={(event) => setFrom(event.target.value)}
                  />
                  <label htmlFor="cohort-to">Hasta</label>
                  <input
                    type="date"
                    id="cohort-to"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
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
              onClick={clear}
              disabled={!activeFilters}
            >
              <CohortIcon name="refresh" />
              Limpiar
            </button>
          </div>
          <section className={styles.list} aria-label="Listado de cohortes">
            {isLoading ? (
              <div className={styles.loading} role="status">
                <span>Cargando cohortes…</span>
                <div />
                <div />
                <div />
              </div>
            ) : error ? (
              <div className={styles.empty}>
                <p role="alert">{error}</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    reloadCohorts();
                    reloadCourses();
                  }}
                >
                  Volver a intentar
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles.empty}>
                <CohortIcon name="layers" />
                <h2>
                  {(cohorts ?? []).length
                    ? "No encontramos coincidencias"
                    : "Tu primera cohorte empieza aquí"}
                </h2>
                <p>
                  {(cohorts ?? []).length
                    ? "Prueba con otro nombre o cambia los filtros."
                    : "Crea una cohorte para definir el curso, el precio y sus fechas."}
                </p>
                {activeFilters ? (
                  <Button variant="secondary" onClick={clear}>
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
            ) : (
              <>
                <div
                  className={styles.tableWrap}
                  role="region"
                  aria-label="Tabla de cohortes, desplazamiento horizontal disponible"
                  tabIndex={0}
                >
                  <table className={styles.table}>
                    <caption className="sr-only">
                      Listado de cohortes. El período se calcula según las fechas del curso; no
                      indica disponibilidad de matrícula.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Cohorte</th>
                        <th scope="col">Curso</th>
                        <th scope="col">Cupo máx.</th>
                        <th scope="col">Precio</th>
                        <th scope="col">Fechas</th>
                        <th scope="col">Período</th>
                        <th scope="col">Editar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((cohort) => (
                        <tr key={cohort.id}>
                          <th scope="row">
                            <div className={styles.cohortName}>
                              <span
                                className={styles.rowDot}
                                data-status={period(cohort, today)}
                                aria-hidden="true"
                              />
                              <div>
                                <strong>{cohort.nombre}</strong>
                                <small>Creada {formatDate(cohort.createdAt)}</small>
                              </div>
                            </div>
                          </th>
                          <td>
                            <CourseIdentity course={coursesById.get(cohort.courseId)} />
                          </td>
                          <td className={styles.numeric}>
                            <span>{cohort.cupoMaximo}</span>
                          </td>
                          <td className={styles.numeric}>{money.format(cohort.precio)}</td>
                          <td>
                            <div className={styles.dateCell}>
                              <CohortIcon name="calendar" />
                              <div>
                                <span>{formatDate(cohort.fechaInicioCurso, true)}</span>
                                <small>al {formatDate(cohort.fechaFinCurso, true)}</small>
                              </div>
                            </div>
                          </td>
                          <td>{statusBadge(cohort)}</td>
                          <td>{editLink(cohort)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className={styles.mobileList}>
                  {filtered.map((cohort) => (
                    <li key={cohort.id}>
                      <header>
                        <h2>{cohort.nombre}</h2>
                        {editLink(cohort)}
                      </header>
                      <CourseIdentity course={coursesById.get(cohort.courseId)} />
                      <dl>
                        <div>
                          <dt>Precio</dt>
                          <dd>{money.format(cohort.precio)}</dd>
                        </div>
                        <div>
                          <dt>Cupo máximo</dt>
                          <dd>{cohort.cupoMaximo}</dd>
                        </div>
                        <div className={styles.wide}>
                          <dt>Fechas del curso</dt>
                          <dd>
                            {formatDate(cohort.fechaInicioCurso, true)} —{" "}
                            {formatDate(cohort.fechaFinCurso, true)}
                          </dd>
                        </div>
                        <div>
                          <dt>Creada</dt>
                          <dd>{formatDate(cohort.createdAt)}</dd>
                        </div>
                        <div>
                          <dt>Período</dt>
                          <dd>{statusBadge(cohort)}</dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {!isLoading && !error ? (
              <footer className={styles.listFooter}>
                <span role="status">
                  Mostrando {filtered.length} de {counts.all} cohortes
                </span>
                <span>Períodos según fechas del curso</span>
              </footer>
            ) : null}
          </section>
        </div>
        {panel ? (
          <aside
            ref={panelRef}
            tabIndex={-1}
            className={styles.sidePanel}
            role={mobile ? "dialog" : "region"}
            aria-modal={mobile || undefined}
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
              {isLoading ? (
                <p className={styles.panelMessage} role="status">
                  Cargando información…
                </p>
              ) : error ? (
                <div className={styles.panelMessage}>
                  <p role="alert">{error}</p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      reloadCohorts();
                      reloadCourses();
                    }}
                  >
                    Volver a intentar
                  </Button>
                </div>
              ) : panel !== "new" && !selected ? (
                <p className={styles.panelMessage} role="alert">
                  No se encontró la cohorte.
                </p>
              ) : courses ? (
                <CohortForm
                  key={panel}
                  courses={courses}
                  cohortId={panel === "new" ? undefined : panel}
                  initialValues={selected ? initialValues(selected) : undefined}
                  onSaved={saved}
                  onCancel={closePanel}
                />
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
