"use client";
import { StudentEmptyState } from "@/components/student-shared/StudentEmptyState";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { ownCatalog, ownCourses } from "@/lib/api/studentContent";
import { friendlyDate, safeProgress } from "@/lib/utils/content";
import { accessLabel, studentContentError } from "@/lib/utils/studentContent";
import { Button } from "@/components/ui/Button";
import { buttonClassName } from "@/components/ui/buttonStyles";
import { useContentSuccess } from "@/components/content-admin/ContentFeedback";
import type { OpenMaterial, StudentCourse as Course, StudentItem } from "@/types/studentContent";
import { StudentError, StudentLoading, StudentProgress } from "./StudentContentUI";
import {
  CourseRoad,
  LearningIcon,
  ExamScoreMeter,
  SubjectEmpty,
  subjectTone,
  visualTitle,
} from "./CourseVisuals";
import styles from "./student-learning.module.css";

export function StudentCourse({ initialCourseId = "" }: { initialCourseId?: string }) {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState(initialCourseId);
  useEffect(() => {
    const controller = new AbortController();
    ownCourses(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setCourses(data);
          setError(null);
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(studentContentError(failure));
      });
    return () => controller.abort();
  }, [revision]);
  if (error) return <StudentError error={error} retry={() => setRevision((value) => value + 1)} />;
  if (!courses) return <StudentLoading />;
  const course = courses.find((entry) => entry.course_id === selected) ?? courses[0];
  return (
    <div className={styles.course}>
      <header className={styles.pageTop}>
        <div>
          <h1>Mi curso</h1>
          <p>
            Tu temario, materiales y exámenes. Avanza a tu ritmo dentro de las fechas habilitadas.
          </p>
        </div>
        {courses.length > 1 ? (
          <label className={styles.courseSelector}>
            Selecciona tu curso
            <select value={course.course_id} onChange={(event) => setSelected(event.target.value)}>
              {courses.map((entry) => (
                <option key={entry.course_id} value={entry.course_id}>
                  {entry.nombre} · Tipo {entry.tipo}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </header>
      {course ? (
        <CourseCatalog key={course.course_id} course={course} />
      ) : (
        <StudentEmptyState
          title="Todavía no hay materias disponibles para ti"
          description="Tu curso aún no tiene contenido asignado. Te avisaremos cuando esté listo."
        />
      )}
    </div>
  );
}

function CourseCatalog({ course }: { course: Course }) {
  const [context, setContext] = useState<Awaited<ReturnType<typeof ownCatalog>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const request = useRef(0);
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      const version = ++request.current;
      try {
        const value = await ownCatalog(course.course_id, signal);
        if (!signal?.aborted && version === request.current) {
          setContext(value);
          setError(null);
        }
      } catch (failure) {
        if (!signal?.aborted && version === request.current) setError(studentContentError(failure));
      } finally {
        if (!signal?.aborted && version === request.current) setRefreshing(false);
      }
    },
    [course.course_id],
  );
  useEffect(() => {
    const controller = new AbortController();
    const version = ++request.current;
    ownCatalog(course.course_id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted && version === request.current) {
          setContext(value);
          setError(null);
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted && version === request.current)
          setError(studentContentError(failure));
      });
    const visible = () => {
      if (document.visibilityState === "visible") void reload(controller.signal);
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", visible);
    };
  }, [reload, course.course_id]);
  useEffect(() => {
    if (!target) return;
    const element = document.getElementById(`content-${target}`);
    if (element) {
      element.scrollIntoView({ block: "center" });
      element.focus({ preventScroll: true });
    }
  }, [target, selectedSubjectId]);
  if (!context)
    return error ? <StudentError error={error} retry={() => void reload()} /> : <StudentLoading />;
  const { catalog, clock } = context;
  const now = clock.serverMs;
  const subjects = catalog.materias.toSorted((a, b) => a.order_index - b.order_index);
  const selectedSubject =
    subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0];
  const percent = safeProgress(catalog.progreso.global, catalog.progreso.completa);
  const completedSubjects = catalog.progreso.materias.filter((entry) => entry.completa).length;
  return (
    <>
      {error ? <StudentError error={error} retry={() => void reload()} /> : null}
      <section aria-label="Progreso de tu curso" className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.heroTitle}>
            <span className={styles.courseTag}>Licencia Tipo {course.tipo}</span>
            <h2>{course.nombre}</h2>
            <p>
              {completedSubjects} de {catalog.progreso.materias.length} materias completas · Cada
              parada cuenta.
            </p>
          </div>
          <div className={styles.heroPercent}>
            <strong>
              {percent.toLocaleString("es-EC", { maximumFractionDigits: 2 })}
              <small>%</small>
            </strong>
            <span>del camino recorrido</span>
          </div>
        </div>
        <div className={styles.heroActions}>
          {catalog.continuar ? (
            <Button
              onClick={() => {
                const next = catalog.continuar!;
                setSelectedSubjectId(next.subject_id);
                setTarget(next.item_id);
              }}
            >
              Continuar donde lo dejaste <LearningIcon name="arrow" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            isLoading={refreshing}
            onClick={() => {
              setRefreshing(true);
              void reload();
            }}
          >
            <LearningIcon name="refresh" /> Actualizar progreso
          </Button>
        </div>
        <CourseRoad progress={catalog.progreso} />
        {catalog.progreso.completa ? (
          <p className={styles.completionBanner}>
            <LearningIcon name="check" /> ¡Completaste el curso!
          </p>
        ) : null}
        {catalog.progreso.sin_contenido ? (
          <p className="pb-4 text-sm text-text-secondary">
            El curso aún no tiene contenido publicado. Tu camino empezará aquí.
          </p>
        ) : null}
      </section>
      {subjects.length > 0 ? (
        <div className={styles.learningLayout}>
          <nav aria-label="Materias del curso" className={styles.subjectNav}>
            <h2 className={styles.navHeading}>Contenido del curso</h2>
            <div className={styles.subjectList}>
              {subjects.map((subject, index) => {
                const progress = catalog.progreso.materias.find(
                  (entry) => entry.subject_id === subject.id,
                );
                const value = safeProgress(progress?.porcentaje ?? 0, progress?.completa ?? false);
                return (
                  <button
                    key={subject.id}
                    type="button"
                    aria-current={selectedSubject?.id === subject.id ? "true" : undefined}
                    aria-controls={`subject-${subject.id}`}
                    onClick={() => setSelectedSubjectId(subject.id)}
                    className={`${styles.subjectButton} ${subjectTone(subject.order_index)}`}
                  >
                    <span className={styles.subjectIcon}>
                      <LearningIcon name={subject.title} />
                    </span>
                    <span className={styles.subjectLabel}>
                      <small>
                        Materia {index + 1}
                        {progress?.completa ? " · ✓ Completa" : ""}
                      </small>
                      <strong>{visualTitle(subject.title)}</strong>
                      <span className={styles.miniProgress}>
                        <i aria-hidden="true">
                          <b style={{ width: `${value}%` }} />
                        </i>
                        <span>{value.toLocaleString("es-EC", { maximumFractionDigits: 2 })}%</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
          <div className={styles.subjectPanel}>
            {subjects.map((subject, index) => {
              const progress = catalog.progreso.materias.find(
                (entry) => entry.subject_id === subject.id,
              );
              return (
                <section
                  key={subject.id}
                  id={`subject-${subject.id}`}
                  hidden={selectedSubject?.id !== subject.id}
                  aria-labelledby={`heading-${subject.id}`}
                  className={subjectTone(subject.order_index)}
                >
                  <header className={styles.subjectHeader}>
                    <span className={styles.subjectIcon}>
                      <LearningIcon name={subject.title} />
                    </span>
                    <div className={styles.subjectHeading}>
                      <small>Materia {index + 1}</small>
                      <h2 id={`heading-${subject.id}`}>{visualTitle(subject.title)}</h2>
                      <StudentProgress
                        value={progress?.porcentaje ?? 0}
                        complete={progress?.completa ?? false}
                        label="Progreso de la materia"
                      />
                      <p>
                        {progress?.completados ?? 0} de {progress?.obligatorios_totales ?? 0}{" "}
                        obligatorios completados
                      </p>
                    </div>
                  </header>
                  {subject.description ? (
                    <p className={styles.subjectDescription}>{subject.description}</p>
                  ) : null}
                  <div className={styles.subjectSummary}>
                    <span>
                      {subject.items.length}{" "}
                      {subject.items.length === 1
                        ? "elemento en esta materia"
                        : "elementos en esta materia"}
                    </span>
                    {progress?.completa ? (
                      <span className={`${styles.chip} ${styles.success}`}>✓ Completa</span>
                    ) : (
                      <span>Tu siguiente parada</span>
                    )}
                  </div>
                  {subject.items.length === 0 ? (
                    <SubjectEmpty />
                  ) : (
                    <div className={styles.timeline}>
                      {subject.items
                        .toSorted((a, b) => a.order_index - b.order_index)
                        .map((item) => (
                          <CourseItem
                            key={item.id}
                            item={item}
                            courseId={course.course_id}
                            now={now}
                            refresh={() => reload()}
                          />
                        ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <StudentEmptyState
          title="Todavía no hay materias disponibles para ti"
          description="Tu curso aún no tiene contenido asignado. Te avisaremos cuando esté listo."
        />
      )}
    </>
  );
}

function CourseItem({
  item,
  courseId,
  now,
  refresh,
}: {
  item: StudentItem;
  courseId: string;
  now: number;
  refresh: () => Promise<void>;
}) {
  const notify = useContentSuccess();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const blocked = item.kind === "examen" && item.bloqueado === true;
  const pending = item.prerequisitos_pendientes ?? [];
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<{ title: string; body: string } | null>(null);
  const completed = optimistic ?? item.completado;
  const available = item.access.estado === "abierto";
  const ongoing = item.intento_en_progreso;
  const closing =
    available && item.access.closes_at && Date.parse(item.access.closes_at) - now < 86_400_000;
  const attemptsLeft =
    item.intentos_permitidos == null || (item.intentos_usados ?? 0) < item.intentos_permitidos;
  async function openMaterial() {
    if (lock.current) return;
    // Reserve a tab during the user gesture, before the signed URL request completes.
    const tab = item.material_kind !== "texto" ? window.open("about:blank", "_blank") : null;
    if (item.material_kind !== "texto" && !tab) {
      setError("Permite abrir pestañas en tu navegador y vuelve a abrir el material.");
      return;
    }
    if (tab) {
      tab.opener = null;
      const meta = tab.document.createElement("meta");
      meta.name = "referrer";
      meta.content = "no-referrer";
      tab.document.head.append(meta);
    }
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const material = await api.post<OpenMaterial>(`/estudiantes/content/items/${item.id}/open`);
      if (material.kind === "texto") {
        tab?.close();
        setText({ title: material.title, body: material.body });
      } else {
        const url = new URL(material.url);
        if (url.protocol !== "https:" && url.protocol !== "http:")
          throw new Error("Invalid material URL");
        if (!tab || tab.closed) throw new Error("Tab closed");
        const anchor = tab.document.createElement("a");
        anchor.href = url.href;
        anchor.rel = "noopener noreferrer";
        anchor.referrerPolicy = "no-referrer";
        anchor.target = "_self";
        tab.document.body.append(anchor);
        anchor.click();
        anchor.remove();
      }
      // Abrir completa el material: el servidor ya lo registró; se actualiza todo sin recargar.
      setOptimistic(true);
      notify("Material abierto y completado.");
      await refresh();
      setOptimistic(null);
    } catch (failure) {
      setOptimistic(null);
      tab?.close();
      setError(studentContentError(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const type =
    item.kind === "examen"
      ? "Examen"
      : item.material_kind === "archivo"
        ? "Archivo"
        : item.material_kind === "enlace"
          ? "Enlace"
          : "Texto";
  return (
    <article
      id={`content-${item.id}`}
      tabIndex={-1}
      data-completed={completed}
      className={`${styles.item} ${item.kind === "examen" ? styles.examItem : ""}`}
    >
      <span className={styles.stateCircle} data-done={completed} aria-hidden="true">
        <LearningIcon
          name={
            completed
              ? "check"
              : item.access.estado === "programado"
                ? "clock"
                : !available || blocked
                  ? "lock"
                  : type
          }
        />
      </span>
      <div className={styles.itemTop}>
        <h3>{item.title}</h3>
        {item.kind === "examen" ? (
          <LearningIcon name="examen" className="shrink-0 text-[var(--subject-ink)]" />
        ) : null}
      </div>
      <div className={styles.chips}>
        <span className={styles.chip}>
          <LearningIcon name={type} />
          {type}
        </span>
        {!item.obligatorio ? <span className={styles.chip}>Opcional</span> : null}
        {completed ? (
          <span className={`${styles.chip} ${styles.success}`}>✓ Completado</span>
        ) : null}
        {blocked ? (
          <span className={`${styles.chip} ${styles.warning}`}>
            <LearningIcon name="lock" />
            Bloqueado
          </span>
        ) : null}
        {closing ? (
          <span className={`${styles.chip} ${styles.warning}`}>
            <LearningIcon name="clock" />
            Cierra pronto
          </span>
        ) : null}
      </div>
      {item.description ? <p className={styles.itemDescription}>{item.description}</p> : null}
      <p
        className={styles.accessText}
        data-state={item.access.estado}
        data-closing={Boolean(closing)}
      >
        <LearningIcon
          name={available ? "clock" : item.access.estado === "programado" ? "clock" : "lock"}
        />
        {accessLabel(item.access)}
      </p>
      {item.kind === "examen" ? (
        <>
          <div className={styles.examStats}>
            <div>
              <strong>
                {item.intentos_usados ?? 0}{" "}
                <span className="text-base font-normal text-text-secondary">
                  / {item.intentos_permitidos ?? "∞"}
                </span>
              </strong>
              <small>Intentos utilizados</small>
            </div>
            <ExamScoreMeter value={item.mejor_nota} />
            {ongoing ? (
              <div>
                <small>Tu intento sigue en curso</small>
                <p>Límite: {friendlyDate(ongoing.deadline_at, true)}</p>
              </div>
            ) : null}
          </div>
          {blocked && pending.length ? (
            <p id={`blocked-${item.id}`} className={styles.accessText} data-state="no_habilitado">
              <LearningIcon name="lock" />
              <span>
                Antes de rendir este examen, completa:{" "}
                {pending.map((entry, index) => (
                  <span key={entry.item_id}>
                    {index > 0 ? ", " : ""}
                    <a
                      href={`#content-${entry.item_id}`}
                      className="underline"
                      onClick={(event) => {
                        event.preventDefault();
                        const element = document.getElementById(`content-${entry.item_id}`);
                        element?.scrollIntoView({ block: "center" });
                        element?.focus({ preventScroll: true });
                      }}
                    >
                      {entry.titulo}
                    </a>
                  </span>
                ))}
              </span>
            </p>
          ) : null}
          <div className={styles.itemActions}>
            {blocked ? (
              <button
                type="button"
                aria-disabled="true"
                aria-describedby={`blocked-${item.id}`}
                className={`${styles.accentAction} cursor-not-allowed opacity-60`}
                onClick={(event) => event.preventDefault()}
              >
                Rendir examen
                <LearningIcon name="arrow" />
              </button>
            ) : ongoing || (available && attemptsLeft) ? (
              <Link
                href={`/student/exams/${item.exam_id}?course_id=${courseId}`}
                className={styles.accentAction}
              >
                {ongoing ? "Continuar intento" : "Rendir examen"}
                <LearningIcon name="arrow" />
              </Link>
            ) : (
              <p className="text-sm text-text-secondary">
                {available && !attemptsLeft
                  ? "No quedan intentos disponibles."
                  : "El examen no está abierto para iniciar."}
              </p>
            )}
            {!ongoing && (item.intentos_usados ?? 0) > 0 ? (
              <Link
                href={`/student/exams/${item.exam_id}?course_id=${courseId}`}
                className={buttonClassName("ghost")}
              >
                Ver resultado
              </Link>
            ) : null}
          </div>
        </>
      ) : (
        <div className={styles.itemActions}>
          <Button
            variant="ghost"
            className={styles.accentAction}
            disabled={!available || busy}
            isLoading={busy}
            onClick={() => void openMaterial()}
          >
            Abrir {type.toLowerCase()}
            <LearningIcon name="arrow" />
          </Button>
        </div>
      )}
      {text ? (
        <section aria-label={text.title} className={styles.textViewer}>
          <h4>{text.title}</h4>
          <p>{text.body}</p>
          <Button variant="ghost" onClick={() => setText(null)}>
            Cerrar texto
          </Button>
        </section>
      ) : null}
      {error ? <StudentError error={error} /> : null}
    </article>
  );
}
