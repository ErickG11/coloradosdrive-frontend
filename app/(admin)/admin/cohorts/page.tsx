"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader, Button, buttonClassName } from "@/components/ui";
import { EditIcon } from "@/components/ui/icons";
import { useFetch } from "@/hooks/useFetch";
import type { Cohort, Course } from "@/types";
import { CohortIcon, CourseIdentity } from "./CohortVisual";
import styles from "./cohorts.module.css";

const money = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "short", year: "numeric" });
function formatDate(value: string, civil = false) {
  const parsed = new Date(civil ? `${value}T12:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? "—" : date.format(parsed);
}

export default function CohortsPage() {
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
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
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
      normalize(`${cohort.nombre} ${course?.nombre ?? ""} ${course?.tipo ?? ""}`).includes(search)
    );
  });
  const counts = {
    all: cohorts?.length ?? 0,
    A: (cohorts ?? []).filter((c) => coursesById.get(c.courseId)?.tipo === "A").length,
    B: (cohorts ?? []).filter((c) => coursesById.get(c.courseId)?.tipo === "B").length,
  };
  function editLink(cohort: Cohort) {
    return (
      <Link
        href={`/admin/cohorts/${cohort.id}/edit`}
        className={styles.edit}
        aria-label={`Editar ${cohort.nombre}`}
      >
        <EditIcon className="h-4 w-4" />
        Editar
      </Link>
    );
  }
  return (
    <div className={styles.page}>
      <PageHeader
        title="Cohortes"
        description="Gestiona y organiza las cohortes de tus cursos"
        actions={
          <Link
            href="/admin/cohorts/new"
            className={buttonClassName("primary", "md", styles.primary)}
          >
            <CohortIcon name="plus" />
            Nueva cohorte
          </Link>
        }
      />
      <section className={styles.summary} aria-label="Resumen de cohortes">
        {(
          [
            { key: "all", label: "Total de cohortes", icon: "layers" },
            { key: "B", label: "Cohortes Tipo B", icon: "car" },
            { key: "A", label: "Cohortes Tipo A", icon: "motorcycle" },
          ] as const
        ).map(({ key, label, icon }) => (
          <div key={key} className={styles.summaryItem}>
            <span
              className={`${styles.summaryIcon} ${key === "A" ? styles.amber : key === "B" ? styles.blue : ""}`}
            >
              <CohortIcon name={icon} />
            </span>
            <div>
              <strong>{isLoading || error ? "—" : counts[key]}</strong>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </section>
      <section className={styles.list} aria-labelledby="cohort-list-title">
        <div className={styles.toolbar}>
          <div>
            <h2 id="cohort-list-title">Lista de cohortes</h2>
            <p>Consulta los cursos, sus fechas y condiciones.</p>
          </div>
          <div className={styles.search}>
            <CohortIcon name="search" />
            <label className="sr-only" htmlFor="cohort-search">
              Buscar cohorte o curso
            </label>
            <input
              id="cohort-search"
              type="search"
              placeholder="Buscar cohorte o curso…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              disabled={isLoading || Boolean(error)}
            />
          </div>
        </div>
        <div className={styles.filters} role="group" aria-label="Filtrar por tipo de curso">
          {(
            [
              { key: "all", label: "Todas" },
              { key: "B", label: "Tipo B" },
              { key: "A", label: "Tipo A" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={type === key}
              disabled={isLoading || Boolean(error)}
              onClick={() => setType(key)}
            >
              {label}
              <span>{isLoading || error ? "—" : counts[key]}</span>
            </button>
          ))}
        </div>
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
            <h3>
              {(cohorts ?? []).length
                ? "No encontramos coincidencias"
                : "Tu primera cohorte empieza aquí"}
            </h3>
            <p>
              {(cohorts ?? []).length
                ? "Prueba con otro nombre o cambia el tipo de curso."
                : "Crea una cohorte para definir el curso, el precio y sus fechas."}
            </p>
            {(cohorts ?? []).length ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setType("all");
                }}
              >
                Limpiar filtros
              </Button>
            ) : (
              <Link href="/admin/cohorts/new" className={buttonClassName()}>
                Nueva cohorte
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className="sr-only">Listado de cohortes</caption>
                <thead>
                  <tr>
                    <th scope="col">Cohorte</th>
                    <th scope="col">Curso</th>
                    <th scope="col">Fechas del curso</th>
                    <th scope="col">Cupo máximo</th>
                    <th scope="col">Precio</th>
                    <th scope="col">Creada</th>
                    <th scope="col">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((cohort) => (
                    <tr key={cohort.id}>
                      <th scope="row">{cohort.nombre}</th>
                      <td>
                        <CourseIdentity course={coursesById.get(cohort.courseId)} />
                      </td>
                      <td>
                        <span>{formatDate(cohort.fechaInicioCurso, true)}</span>
                        <small>al {formatDate(cohort.fechaFinCurso, true)}</small>
                      </td>
                      <td className={styles.numeric}>{cohort.cupoMaximo}</td>
                      <td className={styles.numeric}>{money.format(cohort.precio)}</td>
                      <td className={styles.created}>{formatDate(cohort.createdAt)}</td>
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
                    <h3>{cohort.nombre}</h3>
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
                    <div className={styles.wide}>
                      <dt>Creada</dt>
                      <dd>{formatDate(cohort.createdAt)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
        {!isLoading && !error ? (
          <footer className={styles.listFooter} role="status">
            Mostrando {filtered.length} de {counts.all} cohortes
          </footer>
        ) : null}
      </section>
    </div>
  );
}
