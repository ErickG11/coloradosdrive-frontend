"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { FormError } from "@/components/ui/FormError";
import { Modal } from "@/components/ui/Modal";
import { buttonClassName } from "@/components/ui/buttonStyles";
import { api } from "@/lib/api/client";
import { contentApi } from "@/lib/api/content";
import type { Course } from "@/types/course";
import type { CourseMaterial, CourseSubject, ContentScope, SubjectItem } from "@/types/content";
import { useContentCatalog, type ContentCatalog } from "./useContentCatalog";
import { useContentMutation } from "./useContentResource";
import { ContentLoad, ContentConfirm } from "./ContentUI";
import { MaterialEditor } from "./MaterialEditor";
import { SubjectEditor } from "./SubjectEditor";
import { AccessRulesDialog } from "./AccessRulesDialog";
import { ContentReports } from "./ContentReports";
import { LearningIcon, subjectTone, visualTitle } from "@/components/learning/SubjectIdentity";
import {
  ActionMenu,
  AdminChip,
  AdminEmpty,
  AdminMetric,
  ContentBanner,
  ContentTabs,
} from "./AdminContentUI";
import styles from "./admin-content.module.css";

const legacy = "Exámenes anteriores (sin clasificar)";
const sorted = <T extends { order_index: number }>(values: T[]) =>
  values.slice().sort((a, b) => a.order_index - b.order_index);
function nextOrder(values: { order_index: number }[]) {
  return values.length ? Math.max(...values.map((i) => i.order_index)) + 1 : 0;
}
export function ContentWorkspace({
  initialExam = "",
  initialView = "temario",
}: {
  initialExam?: string;
  initialView?: "temario" | "resultados" | "progreso";
}) {
  const resource = useContentCatalog();
  const [chosenType, setType] = useState<"A" | "B" | null>(null);
  const [courseId, setCourseId] = useState("");
  const linkedExam = resource.data?.exams.find((e) => e.id === initialExam);
  const type =
    chosenType ?? resource.data?.courses.find((c) => c.id === linkedExam?.courseId)?.tipo ?? "A";
  const courses = resource.data?.courses.filter((c) => c.tipo === type) ?? [];
  const course =
    courses.find((c) => c.id === courseId) ??
    courses.find((c) => c.id === linkedExam?.courseId) ??
    courses[0];
  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <div>
          <h1>Contenido</h1>
          <p>Organiza el aprendizaje, configura el acceso y acompaña el avance.</p>
        </div>
        <Button
          variant="ghost"
          disabled={resource.loading || resource.refreshing}
          aria-busy={resource.loading || resource.refreshing}
          onClick={resource.reload}
        >
          <LearningIcon
            name="refresh"
            className={resource.loading || resource.refreshing ? styles.refreshing : undefined}
          />
          Actualizar
        </Button>
      </header>
      <ContentTabs
        segmented
        value={type}
        onChange={(value) => {
          setType(value);
          setCourseId("");
        }}
        items={[
          { value: "A", label: "Tipo A · Motocicletas" },
          { value: "B", label: "Tipo B · Vehículos livianos" },
        ]}
      />
      <ContentLoad
        loading={resource.loading}
        error={resource.error}
        retry={resource.reload}
        empty={!course}
      >
        {resource.data && course ? (
          <>
            {courses.length > 1 ? (
              <Select label="Curso" value={course.id} onChange={(e) => setCourseId(e.target.value)}>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            ) : null}
            <fieldset
              disabled={resource.refreshing}
              className="min-w-0 space-y-4"
              aria-busy={resource.refreshing}
            >
              <CourseContent
                key={course.id}
                course={course}
                catalog={resource.data}
                reload={resource.reload}
                initialExam={initialExam}
                initialView={initialView}
              />
            </fieldset>
          </>
        ) : null}
      </ContentLoad>
    </div>
  );
}
function CourseContent({
  course,
  catalog,
  reload,
  initialExam,
  initialView,
}: {
  course: Course;
  catalog: ContentCatalog;
  reload: () => void;
  initialExam: string;
  initialView: "temario" | "resultados" | "progreso";
}) {
  const [tab, setTab] = useState<"temario" | "resultados" | "habilitaciones" | "progreso">(
    initialView,
  );
  const subjects = sorted(catalog.subjects.filter((s) => s.course_id === course.id));
  const [selected, setSelected] = useState(
    () => catalog.items.find((item) => item.exam_id === initialExam)?.subject_id ?? "",
  );
  const [accessKind, setAccessKind] = useState<ContentScope["scope"]>("curso");
  const [accessChoice, setAccessChoice] = useState("");
  const subject = subjects.find((s) => s.id === selected) ?? subjects[0];
  const [subjectEdit, setSubjectEdit] = useState<{ value: CourseSubject | null } | null>(null);
  const [materialEdit, setMaterialEdit] = useState<{
    value: CourseMaterial | null;
    place?: boolean;
  } | null>(null);
  const [remove, setRemove] = useState<{
    kind: "subjects" | "items" | "materials";
    id: string;
    title: string;
  } | null>(null);
  const [place, setPlace] = useState<{
    kind: "material" | "examen";
    id: string;
    itemId?: string;
  } | null>(null);
  const [destination, setDestination] = useState("");
  const [addExam, setAddExam] = useState(false);
  const [examChoice, setExamChoice] = useState("");
  const [access, setAccess] = useState<{
    scope: ContentScope;
    student?: { id: string; attempts: number };
  } | null>(null);
  const [warning, setWarning] = useState("");
  const action = useContentMutation();
  const materials = new Map(catalog.materials.map((m) => [m.id, m]));
  const exams = new Map(catalog.exams.map((e) => [e.id, e]));
  const names = new Map(catalog.names.map((n) => [n.id, n.nombreCompleto]));
  const cohorts = catalog.cohorts.filter((c) => c.courseId === course.id);
  const items = sorted(catalog.items.filter((i) => i.subject_id === subject?.id));
  const itemPublished = (i: SubjectItem) =>
    i.kind === "material"
      ? materials.get(i.material_id ?? "")?.is_published
      : exams.get(i.exam_id ?? "")?.isPublished;
  const title = (i: SubjectItem) =>
    i.kind === "material"
      ? (materials.get(i.material_id ?? "")?.title ?? "Material no disponible")
      : (exams.get(i.exam_id ?? "")?.title ?? "Examen no disponible");
  const counted = subjects.filter(
    (s) =>
      s.is_published &&
      catalog.items.some((i) => i.subject_id === s.id && i.obligatorio && itemPublished(i)),
  );
  const emptyRequired = subjects.filter(
    (s) => !catalog.items.some((i) => i.subject_id === s.id && i.obligatorio && itemPublished(i)),
  );
  const availableExams = catalog.exams
    .filter((exam) => exam.courseId === course.id)
    .filter((exam) => {
      const i = catalog.items.find((i) => i.exam_id === exam.id);
      return !i || catalog.subjects.find((s) => s.id === i.subject_id)?.title === legacy;
    });
  const unplaced = catalog.materials.filter(
    (m) => !catalog.items.some((i) => i.material_id === m.id),
  );
  function scopeFor(kind: ContentScope["scope"], id: string, label: string): ContentScope {
    const scopeItems = catalog.items.filter((i) =>
      kind === "item"
        ? i.id === id
        : kind === "materia"
          ? i.subject_id === id
          : subjects.some((s) => s.id === i.subject_id),
    );
    return {
      scope: kind,
      id,
      title: label,
      courseId: course.id,
      hasExams: scopeItems.some((i) => i.kind === "examen"),
      item: kind === "item" ? scopeItems[0] : undefined,
    };
  }
  const accessItems = access
    ? catalog.items.filter((i) =>
        access.scope.scope === "item"
          ? i.id === access.scope.id
          : access.scope.scope === "materia"
            ? i.subject_id === access.scope.id
            : subjects.some((s) => s.id === i.subject_id),
      )
    : [];
  // Aviso de borrador con los datos que la pantalla ya tiene cargados (sin llamadas nuevas).
  const draftState = (() => {
    if (!access) return null;
    const kind = access.scope.scope;
    const scopeSubjects =
      kind === "item"
        ? subjects.filter((s) => s.id === accessItems[0]?.subject_id)
        : kind === "materia"
          ? subjects.filter((s) => s.id === access.scope.id)
          : subjects;
    const draftSubjects = scopeSubjects.filter((s) => !s.is_published);
    const draftItems = accessItems.filter((i) => !itemPublished(i));
    if (!draftSubjects.length && !draftItems.length) return null;
    const n = draftItems.length;
    const noun = draftItems.every((i) => i.kind === "material") ? "materiales" : "elementos";
    const nounOne = noun === "materiales" ? "material" : "elemento";
    const label = access.scope.title;
    let text: string;
    if (kind === "curso") {
      const parts = [
        draftSubjects.length
          ? `${draftSubjects.length} ${draftSubjects.length === 1 ? "materia" : "materias"}`
          : "",
        n ? `${n} ${n === 1 ? nounOne : noun}` : "",
      ].filter(Boolean);
      text = `Hay ${parts.join(" y ")} en borrador. Los alumnos no los verán hasta que los publiques.`;
    } else if (kind === "item") {
      text = draftItems.length
        ? `«${label}» está en borrador. Los alumnos no lo verán hasta que lo publiques.`
        : `La materia «${draftSubjects[0].title}» está en borrador. Los alumnos no la verán hasta que la publiques.`;
    } else if (draftSubjects.length) {
      text = n
        ? `«${label}» y ${n} de sus ${noun} están en borrador. Los alumnos no los verán hasta que los publiques.`
        : `«${label}» está en borrador. Los alumnos no la verán hasta que la publiques.`;
    } else {
      text = `${n} de los ${noun} de «${label}» ${n === 1 ? "está" : "están"} en borrador. Los alumnos no ${n === 1 ? "lo verán hasta que lo publiques" : "los verán hasta que los publiques"}.`;
    }
    const target = draftSubjects[0]?.id ?? draftItems[0]?.subject_id ?? null;
    return { text, subjectId: target };
  })();
  async function mutate(work: () => Promise<unknown>, message: string) {
    const result = await action.run(work, message);
    if (result.ok) reload();
  }
  async function reorder(kind: "subjects" | "items", index: number, delta: number) {
    const ids = (kind === "subjects" ? subjects : items).map((v) => v.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    await mutate(
      () =>
        kind === "subjects"
          ? contentApi.orderSubjects(course.id, ids)
          : contentApi.orderItems(subject!.id, ids),
      "Orden actualizado.",
    );
  }
  function openPlace(value: NonNullable<typeof place>) {
    setDestination(subject?.id ?? "");
    setPlace(value);
  }
  async function confirmPlace() {
    if (!place || !destination) return;
    const data = {
      subject_id: destination,
      order_index: nextOrder(catalog.items.filter((i) => i.subject_id === destination)),
    };
    const result = await action.run(
      () =>
        place.itemId
          ? contentApi.patchItem(place.itemId, data)
          : contentApi.place({
              ...data,
              kind: place.kind,
              ...(place.kind === "material" ? { material_id: place.id } : { exam_id: place.id }),
            }),
      "Elemento colocado en la materia.",
    );
    if (result.ok) {
      setPlace(null);
      reload();
    }
  }
  const totalItems = catalog.items.filter((item) =>
    subjects.some((entry) => entry.id === item.subject_id),
  ).length;
  const published = subjects.filter((entry) => entry.is_published).length;
  const scopeOptions =
    accessKind === "materia"
      ? subjects.map((entry) => ({ id: entry.id, label: entry.title }))
      : items.map((item) => ({ id: item.id, label: title(item) }));
  const chosenScope = scopeOptions.find((entry) => entry.id === accessChoice) ?? scopeOptions[0];
  return (
    <fieldset disabled={action.busy} className={styles.panel}>
      <ContentTabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "temario", label: "Temario", icon: "temario", count: subjects.length },
          { value: "resultados", label: "Resultados de exámenes", icon: "stats" },
          { value: "habilitaciones", label: "Habilitaciones", icon: "key" },
          { value: "progreso", label: "Progreso", icon: "ruta" },
        ]}
      />
      <FormError>{action.error}</FormError>
      {warning ? (
        <ContentBanner>
          {warning}
          <Button variant="ghost" onClick={() => setWarning("")}>
            Cerrar aviso
          </Button>
        </ContentBanner>
      ) : null}
      <div role="tabpanel" id={`content-panel-${tab}`} aria-labelledby={`content-tab-${tab}`}>
        {tab === "resultados" || tab === "progreso" ? (
          <ContentReports
            key={tab}
            initialExam={initialExam}
            mode={tab}
            course={course}
            cohorts={cohorts}
            exams={catalog.exams.filter((e) => e.courseId === course.id)}
            names={names}
            subjects={subjects}
            onExtra={(exam, student, used) => {
              const item = catalog.items.find((i) => i.exam_id === exam.id);
              if (!item) {
                setWarning("Coloca primero el examen en una materia para habilitarlo.");
                return;
              }
              setAccess({
                scope: scopeFor("item", item.id, exam.title),
                student: { id: student, attempts: used + 1 },
              });
            }}
          />
        ) : tab === "habilitaciones" ? (
          <section className={styles.surface}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>Habilitaciones del curso</h2>
                <p>Define quién puede acceder, en qué fechas y con cuántos intentos.</p>
              </div>
              <AdminChip tone="info">Hora de Ecuador · UTC−5</AdminChip>
            </div>
            <div className={`${styles.ruleSteps} mt-6`}>
              <span data-active="true">
                <i>1</i>Alcance
              </span>
              <span>
                <i>2</i>Destinatario y fechas
              </span>
              <span>
                <i>3</i>Revisar y aplicar
              </span>
            </div>
            <ContentTabs
              label="Alcance de la habilitación"
              value={accessKind}
              onChange={(kind) => {
                setAccessKind(kind);
                setAccessChoice("");
              }}
              segmented
              items={[
                { value: "curso", label: "Todo el curso" },
                { value: "materia", label: "Una materia" },
                { value: "item", label: "Un elemento" },
              ]}
            />
            {accessKind !== "curso" ? (
              <div className="max-w-xl space-y-4">
                {accessKind === "item" ? (
                  <Select
                    label="Materia"
                    value={subject?.id ?? ""}
                    onChange={(event) => {
                      setSelected(event.target.value);
                      setAccessChoice("");
                    }}
                  >
                    {subjects.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {visualTitle(entry.title)}
                      </option>
                    ))}
                  </Select>
                ) : null}
                <Select
                  label={accessKind === "materia" ? "Materia del alcance" : "Elemento del alcance"}
                  value={chosenScope?.id ?? ""}
                  onChange={(event) => setAccessChoice(event.target.value)}
                >
                  {scopeOptions.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {visualTitle(entry.label)}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <p className="text-base font-medium">
                {course.nombre} · {totalItems} {totalItems === 1 ? "elemento" : "elementos"}
              </p>
            )}
            <ContentBanner tone="info">
              Las reglas son permanentes: se bloquean, no se borran. Una regla individual reemplaza
              por completo la regla de la cohorte. Revisa los destinatarios y las fechas antes de
              confirmar.
            </ContentBanner>
            <Button
              disabled={accessKind === "curso" ? totalItems === 0 : !chosenScope}
              onClick={() =>
                setAccess({
                  scope:
                    accessKind === "curso"
                      ? scopeFor("curso", course.id, course.nombre)
                      : scopeFor(accessKind, chosenScope!.id, chosenScope!.label),
                })
              }
            >
              Configurar habilitación
            </Button>
            <div className={styles.scopeList}>
              {subjects.map((entry) => (
                <div key={entry.id} className={subjectTone(entry.order_index)}>
                  <div>
                    <strong>{visualTitle(entry.title)}</strong>
                    <p>Consulta las reglas de cada elemento desde su detalle.</p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setAccess({ scope: scopeFor("materia", entry.id, entry.title) })}
                  >
                    Configurar materia
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <>
            <section className={styles.summary} aria-label="Resumen del curso">
              <div className={styles.summaryHeading}>
                <div>
                  <h2>{course.nombre}</h2>
                  <p>Temario y publicación · Tipo {course.tipo}</p>
                </div>
                <AdminChip tone="info">Gestión académica</AdminChip>
              </div>
              <div className={styles.metrics}>
                <AdminMetric
                  label={published === 1 ? "Materia publicada" : "Materias publicadas"}
                  value={`${published} / ${subjects.length}`}
                  detail={
                    published === 1 ? "1 materia publicada" : `${published} materias publicadas`
                  }
                />
                <AdminMetric
                  label="Aportan al progreso"
                  value={counted.length}
                  detail="Con obligatorios publicados"
                  icon="check"
                />
                <AdminMetric
                  label="Elementos totales"
                  value={totalItems}
                  detail="Materiales y exámenes"
                  icon="archivo"
                />
                <AdminMetric
                  label="Peso por materia"
                  value={`${(counted.length ? 100 / counted.length : 0).toLocaleString("es-EC", { maximumFractionDigits: 2 })}%`}
                  detail="Repartido por igual"
                  icon="stats"
                />
              </div>
              <p className={styles.help}>
                El peso se reparte por igual entre materias con obligatorios publicados, estén
                habilitados o no.
              </p>
              {emptyRequired.length ? (
                <ContentBanner>
                  <strong>
                    {emptyRequired.length === 1
                      ? "Una materia no aporta al progreso"
                      : `${emptyRequired.length} materias no aportan al progreso`}
                  </strong>
                  <p>No tienen elementos obligatorios publicados.</p>
                  <div className={styles.affected}>
                    {emptyRequired.map((entry) => (
                      <span key={entry.id}>{visualTitle(entry.title)}</span>
                    ))}
                  </div>
                </ContentBanner>
              ) : null}
              {availableExams.length ? (
                <ContentBanner>
                  <strong>
                    {availableExams.length}{" "}
                    {availableExams.length === 1
                      ? "examen pendiente de clasificar"
                      : "exámenes pendientes de clasificar"}
                  </strong>
                  <p>Colócalos en una materia antes de habilitarlos.</p>
                </ContentBanner>
              ) : null}
              <div className={styles.actions}>
                <Button onClick={() => setSubjectEdit({ value: null })}>Nueva materia</Button>
                <Button
                  variant="secondary"
                  disabled={
                    !catalog.items.some((item) =>
                      subjects.some((entry) => entry.id === item.subject_id),
                    )
                  }
                  onClick={() => setAccess({ scope: scopeFor("curso", course.id, course.nombre) })}
                >
                  Habilitar todo el curso
                </Button>
                <Link href="/admin/exams" className={buttonClassName("ghost")}>
                  Gestionar exámenes ↗
                </Link>
              </div>
            </section>
            {!subjects.length ? (
              <div className="mt-6">
                <AdminEmpty
                  title="El curso empieza con su primera materia"
                  actions={
                    <Button onClick={() => setSubjectEdit({ value: null })}>
                      Crear primera materia
                    </Button>
                  }
                >
                  Crea una materia como borrador y organiza después sus materiales y exámenes.
                </AdminEmpty>
              </div>
            ) : (
              <div className={styles.temario}>
                <nav className={styles.subjectList} aria-label="Materias ordenadas">
                  <h3 className={styles.subjectListTitle}>
                    Materias del curso <span className="font-normal">· {subjects.length}</span>
                  </h3>
                  {subjects.map((s, index) => {
                    const ownItems = catalog.items.filter((item) => item.subject_id === s.id);
                    return (
                      <div
                        key={s.id}
                        className={`${styles.subjectRow} ${subjectTone(s.order_index)}`}
                        data-active={subject?.id === s.id}
                      >
                        <button
                          type="button"
                          className={styles.subjectSelect}
                          aria-current={subject?.id === s.id ? "true" : undefined}
                          aria-controls="admin-subject-detail"
                          onClick={() => setSelected(s.id)}
                        >
                          <span className={styles.subjectIcon}>
                            <LearningIcon name={s.title} />
                          </span>
                          <span className={styles.subjectName}>
                            <small>Materia {index + 1}</small>
                            <strong>{visualTitle(s.title)}</strong>
                            <span className={styles.subjectMeta}>
                              <AdminChip tone={s.is_published ? "success" : "neutral"}>
                                {s.is_published ? "Publicada" : "Borrador"}
                              </AdminChip>
                              <span>
                                {ownItems.length} {ownItems.length === 1 ? "elemento" : "elementos"}{" "}
                                · {ownItems.filter((item) => item.obligatorio).length} oblig.
                              </span>
                            </span>
                          </span>
                        </button>
                        <ActionMenu label={`Acciones de ${s.title}`}>
                          <Button
                            role="menuitem"
                            variant="ghost"
                            disabled={action.busy}
                            onClick={() => setSubjectEdit({ value: s })}
                          >
                            Editar materia
                          </Button>
                          <Button
                            role="menuitem"
                            variant="ghost"
                            className={styles.deleteAction}
                            disabled={action.busy}
                            onClick={() =>
                              setRemove({ kind: "subjects", id: s.id, title: s.title })
                            }
                          >
                            Eliminar materia…
                          </Button>
                        </ActionMenu>
                        <div className={styles.subjectFoot}>
                          <button
                            type="button"
                            role="switch"
                            id={`subject-publish-${s.id}`}
                            aria-checked={s.is_published}
                            aria-label={`${s.is_published ? "Despublicar" : "Publicar"} materia ${s.title}`}
                            disabled={action.busy}
                            className={styles.publication}
                            onClick={() =>
                              void mutate(
                                () =>
                                  contentApi.saveSubject(s.id, { is_published: !s.is_published }),
                                s.is_published ? "Materia despublicada." : "Materia publicada.",
                              )
                            }
                          >
                            <span className={styles.switch}>
                              <i />
                            </span>
                            {s.is_published ? "Publicada" : "Publicar"}
                          </button>
                          <div className={styles.rowMoves}>
                            <Button
                              variant="ghost"
                              disabled={action.busy || index === 0}
                              aria-label={`Subir materia ${s.title}`}
                              onClick={() => void reorder("subjects", index, -1)}
                            >
                              ↑
                            </Button>
                            <Button
                              variant="ghost"
                              disabled={action.busy || index === subjects.length - 1}
                              aria-label={`Bajar materia ${s.title}`}
                              onClick={() => void reorder("subjects", index, 1)}
                            >
                              ↓
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </nav>
                {subject ? (
                  <section
                    id="admin-subject-detail"
                    className={`${styles.detail} ${subjectTone(subject.order_index)}`}
                    aria-label={`Elementos de ${subject.title}`}
                  >
                    <header className={styles.subjectHeader}>
                      <div className={styles.subjectHeaderTitle}>
                        <span className={styles.subjectIcon}>
                          <LearningIcon name={subject.title} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p>
                            Materia {subjects.findIndex((entry) => entry.id === subject.id) + 1}
                          </p>
                          <h2>{visualTitle(subject.title)}</h2>
                        </div>
                        <AdminChip tone={subject.is_published ? "success" : "neutral"}>
                          {subject.is_published ? "Publicada" : "Borrador"}
                        </AdminChip>
                      </div>
                      {subject.description ? <p>{subject.description}</p> : null}
                      <div className={styles.actions}>
                        <Button onClick={() => setMaterialEdit({ value: null, place: true })}>
                          Agregar material
                        </Button>
                        <Button variant="secondary" onClick={() => setAddExam(true)}>
                          Agregar examen existente
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={!items.length}
                          onClick={() =>
                            setAccess({ scope: scopeFor("materia", subject.id, subject.title) })
                          }
                        >
                          Habilitar materia
                        </Button>
                      </div>
                      <p>
                        Publicar prepara el contenido; las reglas determinan quién puede abrirlo.
                      </p>
                    </header>
                    {!items.length ? (
                      <AdminEmpty
                        title="Esta materia aún no tiene contenido"
                        actions={
                          <>
                            <Button onClick={() => setMaterialEdit({ value: null, place: true })}>
                              Agregar material
                            </Button>
                            <Button variant="secondary" onClick={() => setAddExam(true)}>
                              Agregar examen existente
                            </Button>
                          </>
                        }
                      >
                        Agrega materiales o coloca un examen del curso para construir su temario.
                      </AdminEmpty>
                    ) : (
                      <div className={styles.itemList}>
                        {items.map((item, index) => {
                          const kind =
                            item.kind === "examen"
                              ? "Examen"
                              : (materials.get(item.material_id ?? "")?.kind ?? "Material");
                          const isRequiredMaterial = (other: SubjectItem) =>
                            other.kind === "material" && other.obligatorio;
                          const requiredBefore = items
                            .slice(0, index)
                            .filter(isRequiredMaterial).length;
                          const requiredAfter = items
                            .slice(index + 1)
                            .filter(isRequiredMaterial).length;
                          return (
                            <article key={item.id} className={styles.item}>
                              <div className={styles.itemTop}>
                                <LearningIcon name={kind} className={styles.itemTypeIcon} />
                                <div className={styles.itemInfo}>
                                  <h3>{title(item)}</h3>
                                  <div className={styles.itemBadges}>
                                    <AdminChip>
                                      {kind.charAt(0).toUpperCase() + kind.slice(1)}
                                    </AdminChip>
                                    <AdminChip tone={item.obligatorio ? "info" : "neutral"}>
                                      {item.obligatorio ? "Obligatorio" : "Opcional"}
                                    </AdminChip>
                                    <AdminChip tone={itemPublished(item) ? "success" : "neutral"}>
                                      {itemPublished(item) ? "Publicado" : "Borrador"}
                                    </AdminChip>
                                  </div>
                                </div>
                                <ActionMenu label={`Acciones de ${title(item)}`}>
                                  <Button
                                    role="menuitem"
                                    variant="ghost"
                                    onClick={() =>
                                      setAccess({ scope: scopeFor("item", item.id, title(item)) })
                                    }
                                  >
                                    Habilitar / ver reglas
                                  </Button>
                                  {item.kind === "material" ? (
                                    <Button
                                      role="menuitem"
                                      variant="ghost"
                                      onClick={() => {
                                        const value = materials.get(item.material_id ?? "");
                                        if (value) setMaterialEdit({ value });
                                      }}
                                    >
                                      Editar material
                                    </Button>
                                  ) : (
                                    <Link
                                      role="menuitem"
                                      href={`/admin/exams/${item.exam_id}/edit`}
                                    >
                                      Editar examen
                                    </Link>
                                  )}
                                  <Button
                                    role="menuitem"
                                    variant="ghost"
                                    disabled={action.busy}
                                    onClick={() =>
                                      void mutate(
                                        () =>
                                          item.kind === "material"
                                            ? contentApi.saveMaterial(item.material_id!, {
                                                is_published: !itemPublished(item),
                                              })
                                            : api.patch(`/exams/${item.exam_id}`, {
                                                isPublished: !itemPublished(item),
                                              }),
                                        itemPublished(item)
                                          ? "Contenido despublicado."
                                          : "Contenido publicado.",
                                      )
                                    }
                                  >
                                    {itemPublished(item) ? "Despublicar" : "Publicar"}
                                  </Button>
                                  <Button
                                    role="menuitem"
                                    variant="ghost"
                                    onClick={() =>
                                      openPlace({
                                        kind: item.kind,
                                        id: (item.material_id ?? item.exam_id)!,
                                        itemId: item.id,
                                      })
                                    }
                                  >
                                    Mover a otra materia
                                  </Button>
                                  <Button
                                    role="menuitem"
                                    variant="ghost"
                                    className={styles.deleteAction}
                                    disabled={action.busy}
                                    onClick={() =>
                                      setRemove({ kind: "items", id: item.id, title: title(item) })
                                    }
                                  >
                                    Quitar de la materia…
                                  </Button>
                                </ActionMenu>
                              </div>
                              {item.kind === "examen" &&
                              (requiredBefore > 0 || requiredAfter > 0) ? (
                                <div className="space-y-1 text-sm text-text-secondary">
                                  {requiredBefore > 0 ? (
                                    <p>
                                      Requiere completar {requiredBefore}{" "}
                                      {requiredBefore === 1
                                        ? "material obligatorio"
                                        : "materiales obligatorios"}{" "}
                                      antes
                                    </p>
                                  ) : null}
                                  {requiredAfter > 0 ? (
                                    <p>
                                      Hay materiales obligatorios después de este examen: no serán
                                      requisito para rendirlo.
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                              <div className={styles.itemMeta}>
                                <label>
                                  <input
                                    type="checkbox"
                                    checked={item.obligatorio}
                                    disabled={action.busy}
                                    onChange={(e) =>
                                      void mutate(
                                        () =>
                                          contentApi.patchItem(item.id, {
                                            obligatorio: e.target.checked,
                                          }),
                                        "Obligatoriedad actualizada.",
                                      )
                                    }
                                  />
                                  Obligatorio para completar
                                </label>
                                <div className={styles.itemControls}>
                                  <button
                                    type="button"
                                    className={styles.accessLink}
                                    onClick={() =>
                                      setAccess({ scope: scopeFor("item", item.id, title(item)) })
                                    }
                                  >
                                    <LearningIcon name="key" />
                                    Consultar habilitación
                                  </button>
                                  <div className={styles.rowMoves}>
                                    <Button
                                      variant="ghost"
                                      aria-label={`Subir ${title(item)}`}
                                      disabled={action.busy || index === 0}
                                      onClick={() => void reorder("items", index, -1)}
                                    >
                                      ↑
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      aria-label={`Bajar ${title(item)}`}
                                      disabled={action.busy || index === items.length - 1}
                                      onClick={() => void reorder("items", index, 1)}
                                    >
                                      ↓
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ) : null}
              </div>
            )}
            <details className={styles.unplaced} open={unplaced.length > 0 ? true : undefined}>
              <summary>
                <span>
                  <strong>Materiales sin colocar</strong> ·{" "}
                  {unplaced.length ? `${unplaced.length} pendientes` : "Sin pendientes"}
                </span>
                <span aria-hidden="true">⌄</span>
              </summary>
              {unplaced.length ? (
                <div className={styles.unplacedBody}>
                  <ContentBanner>
                    Estos materiales están en la biblioteca y aún no pertenecen a ninguna materia.
                    Puedes colocarlos sin volver a subirlos.
                  </ContentBanner>
                  <ul>
                    {unplaced.map((m) => (
                      <li key={m.id}>
                        <div className="min-w-0">
                          <strong>{m.title}</strong>
                          <small>
                            {m.kind} · {m.is_published ? "Publicado" : "Borrador"}
                          </small>
                        </div>
                        <div className="flex shrink-0 items-start gap-1">
                          <Button
                            variant="secondary"
                            disabled={!subjects.length}
                            onClick={() => openPlace({ kind: "material", id: m.id })}
                          >
                            Colocar en una materia
                          </Button>
                          <ActionMenu label={`Acciones de ${m.title}`}>
                            <Button
                              role="menuitem"
                              variant="ghost"
                              onClick={() => setMaterialEdit({ value: m })}
                            >
                              Editar material
                            </Button>
                            <Button
                              role="menuitem"
                              variant="ghost"
                              className={styles.deleteAction}
                              disabled={action.busy}
                              onClick={() =>
                                setRemove({ kind: "materials", id: m.id, title: m.title })
                              }
                            >
                              Eliminar material…
                            </Button>
                          </ActionMenu>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className={`${styles.unplacedBody} ${styles.help}`}>
                  Todos los materiales de la biblioteca ya están colocados.
                </p>
              )}
            </details>
          </>
        )}
      </div>
      {subjectEdit ? (
        <SubjectEditor
          subject={subjectEdit.value}
          courseId={course.id}
          order={nextOrder(subjects)}
          onClose={() => setSubjectEdit(null)}
          onSaved={() => {
            setSubjectEdit(null);
            reload();
          }}
        />
      ) : null}
      {materialEdit ? (
        <MaterialEditor
          material={materialEdit.value}
          placement={
            materialEdit.place && subject
              ? { subjectId: subject.id, order: nextOrder(items) }
              : undefined
          }
          onClose={() => setMaterialEdit(null)}
          onSaved={(message) => {
            setMaterialEdit(null);
            setWarning(message ?? "");
            reload();
          }}
        />
      ) : null}
      {remove ? (
        <ContentConfirm
          key={remove.id}
          title={`Eliminar / quitar ${remove.title}`}
          description={
            remove.kind === "subjects"
              ? "Solo se puede eliminar una materia vacía. Si tiene elementos o progreso, despublícala."
              : remove.kind === "items"
                ? "Se quitará esta colocación. Si tiene reglas, progreso o intentos, no se puede quitar: despublica el contenido. El material o examen se conservará."
                : "Se eliminará el material sin colocar. Si es archivo, también se solicitará borrar su objeto de Storage."
          }
          busy={action.busy}
          error={action.error}
          onClose={() => setRemove(null)}
          onConfirm={() =>
            void (async () => {
              const result = await action.run(
                () => contentApi.remove(remove.kind, remove.id),
                "Elemento eliminado o retirado correctamente.",
              );
              if (result.ok) {
                if (result.value.storage_cleanup_pending)
                  setWarning(
                    "El material se eliminó; quedó pendiente la limpieza manual de su archivo en Storage.",
                  );
                setRemove(null);
                reload();
              }
            })()
          }
        />
      ) : null}
      {place ? (
        <Modal
          isOpen
          onClose={() => {
            if (!action.busy) setPlace(null);
          }}
          title="Colocar o mover elemento"
          className={styles.dialog}
        >
          <div className="space-y-4">
            <p className={styles.dialogDescription}>
              Elige la materia de este curso donde quedará el elemento. El contenido y su historial
              se conservan.
            </p>
            <Select
              label="Materia destino del mismo curso"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="">Elegir materia</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </Select>
            <FormError>{action.error}</FormError>
            <div className={styles.formFooter}>
              <Button variant="secondary" disabled={action.busy} onClick={() => setPlace(null)}>
                Cancelar
              </Button>
              <Button
                disabled={!destination}
                isLoading={action.busy}
                onClick={() => void confirmPlace()}
              >
                Confirmar colocación
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
      {addExam && subject ? (
        <Modal
          isOpen
          onClose={() => setAddExam(false)}
          title="Agregar examen del curso"
          className={styles.dialog}
        >
          <div className="space-y-4">
            <Select
              label="Examen sin clasificar"
              value={examChoice}
              onChange={(e) => setExamChoice(e.target.value)}
            >
              <option value="">Seleccionar examen</option>
              {availableExams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </Select>
            {!availableExams.length ? (
              <p>
                No hay exámenes sin clasificar. Puedes crear uno desde Gestión de exámenes o mover
                uno ya colocado.
              </p>
            ) : null}
            <div className={styles.formFooter}>
              <Button variant="secondary" onClick={() => setAddExam(false)}>
                Cancelar
              </Button>
              <Button
                disabled={!examChoice}
                onClick={() => {
                  const item = catalog.items.find((i) => i.exam_id === examChoice);
                  setAddExam(false);
                  openPlace({ kind: "examen", id: examChoice, itemId: item?.id });
                }}
              >
                Elegir materia destino
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
      {access ? (
        <AccessRulesDialog
          key={`${access.scope.scope}:${access.scope.id}:${access.student?.id ?? ""}`}
          scope={access.scope}
          items={accessItems}
          cohorts={cohorts}
          names={names}
          initialStudent={access.student}
          draftNotice={draftState?.text ?? null}
          onGoPublish={
            draftState?.subjectId
              ? () => {
                  const target = draftState.subjectId!;
                  setAccess(null);
                  setSelected(target);
                  window.requestAnimationFrame(() =>
                    document.getElementById(`subject-publish-${target}`)?.scrollIntoView({
                      block: "center",
                    }),
                  );
                }
              : undefined
          }
          onClose={() => setAccess(null)}
          onSaved={() => {
            setAccess(null);
            reload();
          }}
        />
      ) : null}
    </fieldset>
  );
}
