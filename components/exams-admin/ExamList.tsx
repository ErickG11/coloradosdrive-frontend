"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import {
  useContentResource,
  useContentMutation,
} from "@/components/content-admin/useContentResource";
import {
  ActionMenu,
  AdminChip,
  AdminEmpty,
  ContentBanner,
} from "@/components/content-admin/AdminContentUI";
import { ContentConfirm } from "@/components/content-admin/ContentUI";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormError } from "@/components/ui/FormError";
import { buttonClassName } from "@/components/ui/buttonStyles";
import { LearningIcon, visualTitle } from "@/components/learning/SubjectIdentity";
import { examAvailability } from "@/lib/utils/examAdmin";
import type { Course } from "@/types/course";
import type { Exam } from "@/types/exam";
import { useExamOverview } from "./useExamOverview";
import styles from "./exam-admin.module.css";

export function ExamList() {
  const exams = useContentResource<Exam[]>("/exams");
  const courses = useContentResource<Course[]>("/courses");
  const [chosen, setChosen] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState<Exam | null>(null);
  const action = useContentMutation();
  const course = courses.data?.find((entry) => entry.id === chosen) ?? courses.data?.[0];
  const scoped = useMemo(
    () => (exams.data ?? []).filter((exam) => exam.courseId === course?.id),
    [exams.data, course?.id],
  );
  const overview = useExamOverview(exams.data ? (course?.id ?? null) : null, scoped);
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  const visible = scoped.filter(
    (exam) =>
      (!type || exam.type === type) &&
      (!status || exam.isPublished === (status === "publicado")) &&
      normalize(exam.title + " " + (exam.description ?? "")).includes(normalize(query.trim())),
  );
  function reload() {
    exams.reload();
    courses.reload();
    overview.reload();
  }
  const loading = exams.loading || courses.loading;
  const error = exams.error ?? courses.error;
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1>
            Exámenes <span>{exams.data?.length ?? "—"}</span>
          </h1>
          <p>Crea el banco de evaluación. Organiza su acceso desde Contenido.</p>
        </div>
        <Link href="/admin/exams/new" className={buttonClassName()}>
          Nuevo examen <LearningIcon name="examen" />
        </Link>
      </header>
      <div className={styles.workflow}>
        <span>
          <b>1</b> Crear
        </span>
        <i>→</i>
        <span>
          <b>2</b> Publicar
        </span>
        <i>→</i>
        <span>
          <b>3</b> Colocar en una materia
        </span>
        <i>→</i>
        <span>
          <b>4</b> Habilitar
        </span>
        <Link href="/admin/content">Ir a Contenido ↗</Link>
      </div>
      <div className={styles.filters}>
        <Input
          label="Buscar examen"
          placeholder="Título o descripción…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          label="Curso"
          value={course?.id ?? ""}
          onChange={(event) => setChosen(event.target.value)}
        >
          {courses.data?.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.nombre} (Tipo {entry.tipo})
            </option>
          ))}
        </Select>
        <Select label="Tipo" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="practica">Práctica</option>
          <option value="definitivo">Definitivo</option>
        </Select>
        <Select label="Estado" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="publicado">Publicado</option>
        </Select>
      </div>
      {loading ? (
        <div role="status" aria-label="Cargando exámenes" className={styles.skeletonList}>
          <span className="sr-only">Cargando…</span>
          {[1, 2, 3].map((key) => (
            <div key={key}>
              <i />
              <i />
              <i />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.surface}>
          <FormError>{error}</FormError>
          <Button variant="secondary" onClick={reload}>
            Reintentar carga
          </Button>
        </div>
      ) : !exams.data?.length ? (
        <AdminEmpty
          title="Todavía no hay exámenes."
          actions={
            <Link href="/admin/exams/new" className={buttonClassName()}>
              Crear primer examen
            </Link>
          }
        >
          Empieza con un borrador y prepara sus preguntas antes de publicar.
        </AdminEmpty>
      ) : (
        <>
          <div className={styles.listCaption}>
            <p>
              {visible.length} de {scoped.length}{" "}
              {scoped.length === 1 ? "examen del curso" : "exámenes del curso"}
            </p>
            <Button variant="ghost" onClick={reload}>
              <LearningIcon name="refresh" /> Actualizar
            </Button>
          </div>
          {overview.error ? (
            <ContentBanner>
              Los exámenes siguen disponibles, pero no se pudo verificar su colocación o
              disponibilidad. {overview.error}
              <Button variant="ghost" onClick={overview.reload}>
                Reintentar detalles
              </Button>
            </ContentBanner>
          ) : null}
          {!visible.length ? (
            <AdminEmpty
              title="No hay exámenes que coincidan"
              actions={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setType("");
                    setStatus("");
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            >
              Prueba otro curso, título, tipo o estado.
            </AdminEmpty>
          ) : (
            <div className={styles.examList}>
              {visible.map((exam) => {
                const data = overview.data?.entries[exam.id];
                const availability = examAvailability(
                  exam,
                  {
                    questionCount: data?.details?.questions.length,
                    subject: data?.subject,
                    rules: data?.rules,
                    failed: Boolean(overview.error || data?.errors.length),
                    placementKnown: Boolean(data),
                  },
                  overview.data?.now ?? 0,
                );
                return (
                  <article key={exam.id} className={styles.examCard} aria-label={exam.title}>
                    <div className={styles.cardHeading}>
                      <span className={styles.examIcon}>
                        <LearningIcon name="examen" />
                      </span>
                      <div className={styles.cardTitle}>
                        <h2>{exam.title}</h2>
                        <div className={styles.chips}>
                          <AdminChip tone="info">
                            {course?.nombre ?? "Curso no disponible"} (Tipo {course?.tipo ?? "—"})
                          </AdminChip>
                          <AdminChip>
                            {exam.type === "practica" ? "Práctica" : "Definitivo"}
                          </AdminChip>
                          <AdminChip tone={exam.isPublished ? "success" : "neutral"}>
                            {exam.isPublished ? "Publicado" : "Borrador"}
                          </AdminChip>
                        </div>
                      </div>
                      <ActionMenu label={`Acciones de ${exam.title}`}>
                        <Button
                          role="menuitem"
                          variant="ghost"
                          className="text-status-error"
                          disabled={action.busy}
                          onClick={() => setDeleting(exam)}
                        >
                          Eliminar
                        </Button>
                      </ActionMenu>
                    </div>
                    {exam.description ? (
                      <p className={styles.description}>{exam.description}</p>
                    ) : null}
                    <div className={styles.examStats}>
                      <div>
                        <span>Preguntas · puntos</span>
                        <strong>
                          {data?.details
                            ? `${data.details.questions.length} · ${data.details.questions.reduce((sum, q) => sum + Number(q.points), 0).toLocaleString("es-EC")}`
                            : "Por verificar"}
                        </strong>
                      </div>
                      <div>
                        <span>Tiempo límite</span>
                        <strong>{exam.timeLimitMinutes} min</strong>
                      </div>
                      <div>
                        <span>Nota mínima</span>
                        <strong>{exam.passingScorePercent}%</strong>
                      </div>
                      <div>
                        <span>Intentos por defecto</span>
                        <strong>{exam.maxAttemptsDefault ?? "∞"}</strong>
                      </div>
                      <div>
                        <span>Intentos realizados</span>
                        <strong>{data?.attempts ?? "Por verificar"}</strong>
                      </div>
                    </div>
                    <div className={styles.availability}>
                      <div>
                        <AdminChip tone={availability.ready ? "success" : "neutral"}>
                          {availability.label}
                        </AdminChip>
                        {data?.subject ? <p>Materia: {visualTitle(data.subject.title)}</p> : null}
                      </div>
                      <ul aria-label="Condiciones de disponibilidad">
                        {availability.checks.map((check) => (
                          <li key={check.label} data-met={check.value}>
                            <span aria-hidden="true">
                              {check.value === true ? "✓" : check.value === false ? "○" : "·"}
                            </span>
                            {check.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {data?.errors.length ? (
                      <p role="alert" className={styles.help}>
                        No se pudieron verificar todos los detalles. {data.errors[0]}{" "}
                        <button type="button" className="underline" onClick={overview.reload}>
                          Reintentar
                        </button>
                      </p>
                    ) : null}
                    <div className={styles.cardFooter}>
                      <div>
                        <Link
                          href={`/admin/exams/${exam.id}/edit`}
                          className={buttonClassName("secondary")}
                          aria-label={`Editar ${exam.title}`}
                        >
                          Editar
                        </Link>
                        <Link
                          href={`/admin/content?view=resultados&exam=${exam.id}`}
                          className={buttonClassName("ghost")}
                        >
                          Resultados
                        </Link>
                      </div>
                      <Link href={`/admin/content?exam=${exam.id}`} className={styles.contentLink}>
                        Ir a Contenido ↗
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <p className={styles.help}>
            {overview.loading ? "Verificando preguntas, intentos y habilitaciones del curso… " : ""}
            Publicado no significa acceso para todos: cada alumno necesita una matrícula elegible y
            una regla aplicable abierta. La regla individual reemplaza a la de cohorte. Estado de
            fechas orientativo; el servidor decide.
          </p>
        </>
      )}
      {deleting ? (
        <ContentConfirm
          key={deleting.id}
          title={`Eliminar ${deleting.title}`}
          description="Solo se puede eliminar un examen sin colocaciones ni intentos. Su banco de preguntas se eliminará. Si tiene vínculos o intentos, despublícalo; retirar la publicación no elimina esas dependencias."
          busy={action.busy}
          error={action.error}
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            void (async () => {
              const result = await action.run(
                () => api.delete(`/exams/${deleting.id}`),
                "Examen eliminado.",
              );
              if (result.ok) {
                setDeleting(null);
                reload();
              }
            })()
          }
        />
      ) : null}
    </div>
  );
}
