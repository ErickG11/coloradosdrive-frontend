"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useFetch } from "@/hooks/useFetch";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button, buttonClassName } from "@/components/ui/Button";
import type { AdminDashboardSummary } from "@/types/adminDashboard";
import { DashboardIcon, type DashboardIconName } from "./DashboardIcon";
import styles from "./dashboard.module.css";

const EvolutionChart = dynamic(() => import("./DashboardCharts").then((m) => m.EvolutionChart), {
  ssr: false,
  loading: () => <div className={styles.chartSkeleton} />,
});
const DistributionChart = dynamic(
  () => import("./DashboardCharts").then((m) => m.DistributionChart),
  { ssr: false, loading: () => <div className={styles.donutSkeleton} /> },
);
const integer = (value: number) => value.toLocaleString("es-EC");
const usd = (value: number) =>
  new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-EC", { ...options, timeZone: "America/Guayaquil" }).format(
    new Date(date.length === 10 ? `${date}T12:00:00-05:00` : date),
  );
const monthLabel = (month: string) => dateLabel(`${month}-01`, { month: "long", year: "numeric" });

function Feedback({
  error,
  empty,
  children,
  onRetry,
}: {
  error?: string | null;
  empty?: boolean;
  children: ReactNode;
  onRetry: () => void;
}) {
  if (error)
    return (
      <div className={styles.feedback} role="alert">
        <p>{error}</p>
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  if (empty)
    return (
      <div className={styles.feedback}>
        <DashboardIcon name="calendar" />
        <p>{children}</p>
      </div>
    );
  return children;
}
function Metric({
  title,
  value,
  note,
  icon,
  trend,
  comparison,
  error,
}: {
  title: string;
  value: string;
  note: string;
  icon: DashboardIconName;
  trend?: number | null;
  comparison?: string;
  error?: boolean;
}) {
  return (
    <article className={styles.metric} aria-label={title}>
      <div className={styles.metricTop}>
        <span>{title}</span>
        <DashboardIcon name={icon} />
      </div>
      <strong className={styles.metricValue}>{error ? "—" : value}</strong>
      <div className={styles.metricFoot}>
        {!error && trend !== undefined && trend !== null ? (
          <>
            <span className={styles.trend}>
              {trend > 0 ? "+" : ""}
              {trend.toLocaleString("es-EC")}%
            </span>
            <span title={comparison}>{comparison}</span>
          </>
        ) : (
          <span>{error ? "No disponible" : note}</span>
        )}
      </div>
    </article>
  );
}
function PanelHeading({
  title,
  note,
  href,
  children,
}: {
  title: string;
  note?: string;
  href?: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.panelHeading}>
      <div>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      {href && (
        <Link
          href={href}
          aria-label={`Consultar ${title.toLowerCase()}`}
          className={styles.textLink}
        >
          Ver todos <DashboardIcon name="arrow" />
        </Link>
      )}
      {children}
    </div>
  );
}
function Calendar({
  month,
  day,
  today,
  days,
  onSelect,
}: {
  month: string;
  day: string;
  today: string;
  days: { date: string; count: number }[];
  onSelect: (day: string) => void;
}) {
  const [year, mon] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, mon - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const counts = new Map(days.map((d) => [d.date, d.count]));
  return (
    <div className={styles.calendar}>
      <div className={styles.weekdays} aria-hidden="true">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div
        className={styles.calendarGrid}
        role="group"
        aria-label={`Seleccionar día de ${monthLabel(month)}`}
      >
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const count = counts.get(date) ?? 0;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={day === date}
              aria-current={today === date ? "date" : undefined}
              aria-label={`${dateLabel(date, { day: "numeric", month: "long" })}, ${count} prácticas`}
              data-selected={day === date}
              data-today={today === date}
            >
              {i + 1}
              {count > 0 && <span className={styles.dayDot} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <p className={styles.calendarLegend}>
        <span /> Prácticas asignadas, confirmadas o completadas
      </p>
    </div>
  );
}

export function AdminDashboard({
  month,
  day,
  today,
}: {
  month: string;
  day: string;
  today: string;
}) {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const [metric, setMetric] = useState<"enrollments" | "practices">("enrollments");
  const path = `/admin/dashboard?${new URLSearchParams({ month, day })}`;
  const { data, isLoading, error, refetch } = useFetch<AdminDashboardSummary>(path);
  const pending = isLoading || navigating;
  const summary = !error && data?.month === month ? data : null;
  const contentLoading = pending && !summary;
  const current = summary?.current.data;
  const activity = summary?.activity.data;
  const agenda = summary?.agenda.data;
  const change = (nextMonth: string, nextDay?: string) =>
    startTransition(() => {
      router.replace(
        `/admin?${new URLSearchParams({ month: nextMonth, day: nextDay ?? (nextMonth === today.slice(0, 7) ? today : `${nextMonth}-01`) })}`,
        { scroll: false },
      );
    });
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = new FormData(event.currentTarget).get("month");
    if (typeof selected === "string" && selected) change(selected);
  }
  const moveMonth = (amount: number) => {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + amount);
    change(date.toISOString().slice(0, 7));
  };
  const hasSectionError =
    summary &&
    [summary.current, summary.activity, summary.agenda, summary.documents].some((s) => s.error);
  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1>Panel de administración</h1>
          <p>Tu escuela, de un vistazo. Decide el siguiente paso.</p>
        </div>
        <Link
          href="/admin/enrollments"
          className={buttonClassName("primary", "md", styles.enrollButton)}
        >
          Matricular alumno <DashboardIcon name="arrow" />
        </Link>
      </header>
      <div className={styles.toolbar}>
        <form key={month} onSubmit={filter} className={styles.monthFilter}>
          <DashboardIcon name="calendar" />
          <label htmlFor="dashboard-month">Periodo</label>
          <input
            id="dashboard-month"
            name="month"
            type="month"
            defaultValue={month}
            min="2000-01"
            max={today.slice(0, 7)}
            required
          />
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            Aplicar
          </Button>
        </form>
        <div className={styles.freshness}>
          <span>
            {pending
              ? "Actualizando…"
              : summary
                ? `Actualizado ${dateLabel(summary.generatedAt, { hour: "2-digit", minute: "2-digit" })}`
                : "Resumen operativo"}
          </span>
          <button
            type="button"
            onClick={refetch}
            disabled={pending}
            aria-label="Actualizar panel"
            title="Actualizar panel"
          >
            <DashboardIcon name="refresh" />
          </button>
        </div>
      </div>
      <div className={styles.statusLine} aria-live="polite" role="status">
        {pending
          ? "Cargando resumen del panel…"
          : summary?.period.partial
            ? "Mes en curso: las tendencias comparan el mismo tramo del mes anterior."
            : `Resumen de ${monthLabel(month)}.`}
      </div>
      {error && (
        <div className={styles.errorBanner} role="alert">
          <p>{error}</p>
          <Button variant="secondary" onClick={refetch}>
            Reintentar
          </Button>
          <Link href="/admin">Volver al mes actual</Link>
        </div>
      )}
      {hasSectionError && (
        <div className={styles.errorBanner} role="alert">
          <p>Parte del resumen no está disponible. Las demás secciones conservan sus datos.</p>
          <Button variant="secondary" onClick={refetch}>
            Reintentar
          </Button>
        </div>
      )}
      <div
        className={`${styles.metrics} ${contentLoading ? styles.loading : ""}`}
        aria-busy={contentLoading}
      >
        <Metric
          title="Alumnos activos"
          value={integer(current?.activeStudents ?? 0)}
          note="Con matrícula activa · hoy"
          icon="students"
          error={!current}
        />
        <Metric
          title="Nuevas matrículas"
          value={integer(activity?.newEnrollments ?? 0)}
          note="En el periodo seleccionado"
          icon="enroll"
          trend={activity?.enrollmentTrend}
          comparison={activity?.comparison}
          error={!activity}
        />
        <Metric
          title="Prácticas realizadas"
          value={integer(activity?.completedPractices ?? 0)}
          note="Con asistencia · en el periodo"
          icon="car"
          trend={activity?.practiceTrend}
          comparison={activity?.comparison}
          error={!activity}
        />
        <Metric
          title="Saldo por cobrar"
          value={usd(current?.balance ?? 0)}
          note="Saldo registrado · hoy"
          icon="money"
          error={!current}
        />
      </div>
      {!error && (
        <div className={styles.workspace} aria-busy={pending}>
          <div className={styles.mainColumn}>
            <div className={styles.analytics}>
              <section className={styles.panel} aria-labelledby="evolution-title">
                <div className={styles.panelHeading}>
                  <div>
                    <h2 id="evolution-title">Evolución de la escuela</h2>
                    <p>Seis meses hasta {monthLabel(month)}</p>
                  </div>
                </div>
                <div className={styles.chartTabs} role="group" aria-label="Métrica del gráfico">
                  {(
                    [
                      ["enrollments", "Matrículas"],
                      ["practices", "Prácticas"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={metric === value}
                      onClick={() => setMetric(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {contentLoading ? (
                  <div className={styles.chartSkeleton} />
                ) : (
                  <Feedback
                    error={summary?.activity.error ?? error}
                    empty={!activity || activity.series.every((p) => p[metric] === 0)}
                    onRetry={refetch}
                  >
                    {!activity || activity.series.every((p) => p[metric] === 0) ? (
                      "Aún no hay registros para esta métrica. Cuando existan, verás su evolución aquí."
                    ) : (
                      <>
                        <EvolutionChart series={activity.series} metric={metric} />
                        <div className={styles.chartValues}>
                          <table>
                            <caption className="sr-only">
                              Valores mensuales de{" "}
                              {metric === "enrollments" ? "matrículas" : "prácticas"}
                            </caption>
                            <thead>
                              <tr>
                                {activity.series.map((p) => (
                                  <th key={p.month} scope="col">
                                    {dateLabel(`${p.month}-01`, { month: "short" })}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {activity.series.map((p) => (
                                  <td key={p.month}>{p[metric]}</td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </Feedback>
                )}
              </section>
              <section className={styles.panel}>
                <PanelHeading title="Distribución de alumnos" note="Matrículas activas · hoy" />
                {contentLoading ? (
                  <div className={styles.donutSkeleton} />
                ) : (
                  <Feedback
                    error={summary?.current.error ?? error}
                    empty={!current || !current.activeStudents}
                    onRetry={refetch}
                  >
                    {!current || !current.activeStudents ? (
                      "Los alumnos con matrícula activa aparecerán aquí, agrupados por licencia."
                    ) : (
                      <>
                        <DistributionChart distribution={current.distribution} />
                        <ul className={styles.distribution}>
                          {current.distribution.map((item, i) => (
                            <li key={item.key}>
                              <span className={styles.swatch} data-tone={i} />
                              <div>
                                <strong>{item.label}</strong>
                                <span>{integer(item.value)} alumnos</span>
                              </div>
                              <b>{Math.round((item.value / current.activeStudents) * 100)}%</b>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </Feedback>
                )}
              </section>
            </div>
            <section className={`${styles.panel} ${styles.academic}`}>
              <PanelHeading
                title="Actividad académica"
                note="Exámenes iniciados y prácticas asistidas en el periodo"
                href="/admin/exams"
              />
              {contentLoading ? (
                <div className={styles.lineSkeleton} />
              ) : (
                <Feedback error={summary?.activity.error ?? error} onRetry={refetch}>
                  <div className={styles.academicStats}>
                    <div>
                      <DashboardIcon name="book" />
                      <strong>
                        {activity ? integer(activity.academic.studentsWithAttempts) : "—"}
                      </strong>
                      <span>Alumnos con intentos</span>
                    </div>
                    <div>
                      <DashboardIcon name="check" />
                      <strong>
                        {activity
                          ? `${activity.academic.passedAttempts}/${activity.academic.completedAttempts}`
                          : "—"}
                      </strong>
                      <span>Intentos aprobados / calificados</span>
                    </div>
                    <div>
                      <strong>
                        {activity?.academic.averageScore != null
                          ? `${activity.academic.averageScore}%`
                          : "—"}
                      </strong>
                      <span>Calificación promedio</span>
                    </div>
                    <div>
                      <DashboardIcon name="clock" />
                      <strong>
                        {activity ? `${integer(activity.academic.practiceHours)} h` : "—"}
                      </strong>
                      <span>Práctica con asistencia</span>
                    </div>
                  </div>
                  <p className={styles.note}>
                    Los intentos de examen no miden tiempo de estudio ni lecciones completadas.
                  </p>
                </Feedback>
              )}
            </section>
            <section className={`${styles.panel} ${styles.recent}`}>
              <PanelHeading
                title="Últimas matrículas"
                note={monthLabel(month)}
                href="/admin/students"
              />
              {contentLoading ? (
                <div className={styles.tableSkeleton} />
              ) : (
                <Feedback
                  error={summary?.activity.error ?? error}
                  empty={!activity?.recentEnrollments.length}
                  onRetry={refetch}
                >
                  {!activity?.recentEnrollments.length ? (
                    "No se registraron matrículas en este periodo. Puedes consultar otros meses o matricular un alumno."
                  ) : (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <caption className="sr-only">
                          Últimas matrículas del periodo y acceso a cada alumno
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Alumno</th>
                            <th scope="col">Curso</th>
                            <th scope="col">Inscripción</th>
                            <th scope="col">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activity.recentEnrollments.map((e) => (
                            <tr key={e.id}>
                              <td>
                                <Link
                                  href={`/admin/students/${e.studentId}`}
                                  className={styles.studentLink}
                                >
                                  <span className={styles.avatar} aria-hidden="true">
                                    {e.name
                                      .split(/\s+/)
                                      .filter(Boolean)
                                      .slice(0, 2)
                                      .map((word) => word[0])
                                      .join("")}
                                  </span>
                                  <span>
                                    {e.name}
                                    <small>
                                      {e.cohort
                                        ? /^cohorte/i.test(e.cohort)
                                          ? e.cohort
                                          : `Cohorte ${e.cohort}`
                                        : "Sin cohorte"}
                                    </small>
                                  </span>
                                  <DashboardIcon name="chevron" />
                                </Link>
                              </td>
                              <td>
                                <span className={styles.courseBadge} data-type={e.courseType}>
                                  Tipo {e.courseType}
                                </span>
                              </td>
                              <td>{dateLabel(e.date, { day: "2-digit", month: "short" })}</td>
                              <td>
                                <StatusBadge status={e.status}>
                                  {(
                                    {
                                      activo: "Activo",
                                      pendiente_cohorte: "Sin cohorte",
                                      finalizado: "Finalizado",
                                      retirado: "Retirado",
                                    } as Record<string, string>
                                  )[e.status] ?? e.status}
                                </StatusBadge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Feedback>
              )}
            </section>
          </div>
          <aside className={styles.sideColumn} aria-label="Agenda y pendientes">
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <h2>Calendario de prácticas</h2>
                <DashboardIcon name="calendar" />
              </div>
              <div className={styles.calendarMonth}>
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  aria-label="Mes anterior"
                  disabled={pending || month === "2000-01"}
                >
                  <DashboardIcon name="chevron" />
                </button>
                <strong>{monthLabel(month)}</strong>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  aria-label="Mes siguiente"
                  disabled={pending || month >= today.slice(0, 7)}
                >
                  <DashboardIcon name="chevron" />
                </button>
              </div>
              {pending ? (
                <div className={styles.calendarSkeleton} />
              ) : (
                <Feedback error={summary?.agenda.error ?? error} onRetry={refetch}>
                  <Calendar
                    month={month}
                    day={day}
                    today={today}
                    days={agenda?.days ?? []}
                    onSelect={(date) => change(month, date)}
                  />
                </Feedback>
              )}
            </section>
            <section className={`${styles.panel} ${styles.agenda}`}>
              <PanelHeading
                title="Agenda del día"
                note={dateLabel(day, { weekday: "long", day: "numeric", month: "short" })}
                href="/admin/practice-slots"
              />
              {pending ? (
                <div className={styles.tableSkeleton} />
              ) : (
                <Feedback
                  error={summary?.agenda.error ?? error}
                  empty={!agenda?.slots.length}
                  onRetry={refetch}
                >
                  {!agenda?.slots.length ? (
                    "Este día no tiene prácticas asignadas. Selecciona un día marcado o abre Horarios de práctica."
                  ) : (
                    <>
                      <ul className={styles.agendaList}>
                        {agenda.slots.map((slot) => (
                          <li key={slot.id}>
                            <time dateTime={slot.date}>
                              {dateLabel(slot.date, {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              })}
                              <span>{slot.duration} min</span>
                            </time>
                            <div>
                              {slot.studentId ? (
                                <Link href={`/admin/students/${slot.studentId}`}>
                                  {slot.student}
                                  <DashboardIcon name="chevron" />
                                </Link>
                              ) : (
                                <strong>{slot.student}</strong>
                              )}
                              <p>{slot.instructor}</p>
                              <small>{slot.cohort}</small>
                              <StatusBadge status={slot.status} />
                            </div>
                          </li>
                        ))}
                      </ul>
                      {agenda.totalForDay > agenda.slots.length && (
                        <Link className={styles.textLink} href="/admin/practice-slots">
                          Consultar las {agenda.totalForDay} prácticas{" "}
                          <DashboardIcon name="arrow" />
                        </Link>
                      )}
                    </>
                  )}
                </Feedback>
              )}
            </section>
            <section className={`${styles.panel} ${styles.pendingPanel}`}>
              <PanelHeading title="Necesitan atención" note="Pendientes actuales" />
              <Link
                href="/admin/students?pendienteCohorte=true&activo=true"
                className={styles.pendingLink}
              >
                <span>Alumnos sin cohorte</span>
                <strong>{pending || !current ? "—" : integer(current.pendingCohort)}</strong>
                <DashboardIcon name="arrow" />
              </Link>
              <Link
                href="/admin/students?documentosPendientes=true&activo=true"
                className={styles.pendingLink}
              >
                <span>Documentos pendientes</span>
                <strong>
                  {pending || !summary?.documents.data
                    ? "—"
                    : integer(summary.documents.data.studentsPending)}
                </strong>
                <DashboardIcon name="arrow" />
              </Link>
              {summary?.documents.error && (
                <p className={styles.note}>
                  No se pudo consultar documentos. Abre el listado para revisar.
                </p>
              )}
              {current && current.unpricedEnrollments > 0 && (
                <p className={styles.note}>
                  {integer(current.unpricedEnrollments)} matrículas sin precio definido no se
                  incluyen en el saldo.
                </p>
              )}
              <p className={styles.note}>
                El saldo se calcula con los abonos registrados; no indica mora ni ingresos del mes.
              </p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
