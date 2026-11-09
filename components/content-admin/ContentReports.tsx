"use client";
import { useState } from "react";
import Link from "next/link";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import type { Course } from "@/types/course";
import type { Cohort } from "@/types/cohort";
import type { Exam } from "@/types/exam";
import type { CohortProgress, CourseProgress, ExamResult, CourseSubject } from "@/types/content";
import { useContentResource } from "./useContentResource";
import { ContentLoad, ContentProgressBar } from "./ContentUI";
import { AdminChip, AdminEmpty, ContentBanner } from "./AdminContentUI";
import { ExamResultsView, CohortProgressView } from "./ReportViews";
import { LearningIcon, subjectTone, visualTitle } from "@/components/learning/SubjectIdentity";
import styles from "./admin-content.module.css";
export function ContentReports({
  mode,
  course,
  cohorts,
  exams,
  names,
  onExtra,
  initialExam = "",
  subjects = [],
}: {
  mode: "resultados" | "progreso";
  course: Course;
  cohorts: Cohort[];
  exams: Exam[];
  names: Map<string, string>;
  onExtra: (exam: Exam, student: string, used: number) => void;
  initialExam?: string;
  subjects?: CourseSubject[];
}) {
  const [cohortId, setCohortId] = useState("");
  const [examId, setExamId] = useState(
    exams.find((e) => e.id === initialExam)?.id ?? exams[0]?.id ?? "",
  );
  const [studentId, setStudentId] = useState("");
  const results = useContentResource<ExamResult[]>(
    mode === "resultados" && examId
      ? `/admin/content/exams/${examId}/results${cohortId ? `?cohort_id=${cohortId}` : ""}`
      : null,
  );
  const progress = useContentResource<CohortProgress>(
    mode === "progreso" && cohortId ? `/admin/content/cohorts/${cohortId}/progress` : null,
  );
  const detail = useContentResource<CourseProgress>(
    studentId ? `/admin/content/students/${studentId}/courses/${course.id}/progress` : null,
  );
  const exam = exams.find((e) => e.id === examId);
  return (
    <section className="min-w-0 space-y-5">
      <div className={styles.sectionHeading}>
        <div>
          <h2>{mode === "resultados" ? "Resultados de exámenes" : "Progreso de aprendizaje"}</h2>
          <p>
            {mode === "resultados"
              ? "Consulta intentos, notas y oportunidades de recuperación."
              : "Acompaña el avance de la cohorte y revisa cada materia."}
          </p>
        </div>
      </div>
      <div className={styles.filters}>
        {mode === "resultados" ? (
          <Select label="Examen" value={examId} onChange={(e) => setExamId(e.target.value)}>
            <option value="">Seleccionar examen</option>
            {exams.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title}
              </option>
            ))}
          </Select>
        ) : null}
        <Select
          label="Cohorte del curso"
          value={cohortId}
          onChange={(e) => setCohortId(e.target.value)}
        >
          <option value="">
            {mode === "resultados" ? "Todas las cohortes" : "Seleccionar cohorte"}
          </option>
          {cohorts.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.nombre}
            </option>
          ))}
        </Select>
      </div>
      {mode === "resultados" ? (
        !exam ? (
          <AdminEmpty
            title="Selecciona un examen"
            actions={
              <Link className="text-status-info underline" href="/admin/exams/new">
                Crear examen
              </Link>
            }
          >
            Aquí verás los resultados cuando un alumno complete su primer intento.
          </AdminEmpty>
        ) : (
          <ContentLoad
            loading={results.loading}
            error={results.error}
            retry={results.reload}
            empty={results.data?.length === 0}
          >
            {results.data ? (
              <ExamResultsView
                rows={results.data}
                exam={exam}
                names={names}
                onExtra={onExtra}
                reload={results.reload}
              />
            ) : null}
          </ContentLoad>
        )
      ) : !cohortId ? (
        <AdminEmpty title="El avance empieza con una cohorte">
          Selecciona una cohorte del curso para ver su progreso y abrir el detalle de cada alumno.
        </AdminEmpty>
      ) : (
        <ContentLoad
          loading={progress.loading}
          error={progress.error}
          retry={progress.reload}
          empty={progress.data?.students.length === 0}
        >
          {progress.data ? (
            <CohortProgressView
              data={progress.data}
              onStudent={setStudentId}
              reload={progress.reload}
            />
          ) : null}
        </ContentLoad>
      )}
      {studentId ? (
        <Modal
          isOpen
          onClose={() => setStudentId("")}
          title={`Progreso · ${names.get(studentId) ?? "Alumno"}`}
          className={`${styles.dialog} ${styles.drawer}`}
        >
          <p className={styles.dialogDescription}>Avance académico por materia · {course.nombre}</p>
          <ContentLoad loading={detail.loading} error={detail.error} retry={detail.reload}>
            {detail.data ? (
              <div className="space-y-5">
                <ContentProgressBar
                  label="Global del curso"
                  value={detail.data.global}
                  complete={detail.data.completa}
                />
                <div className="flex flex-wrap gap-2">
                  <AdminChip tone={detail.data.certificado_listo ? "success" : "neutral"}>
                    {detail.data.certificado_listo
                      ? "✓ Certificado listo"
                      : "Certificado aún no listo"}
                  </AdminChip>
                  <AdminChip>
                    {detail.data.materias.filter((entry) => entry.completa).length} de{" "}
                    {detail.data.materias.length} materias completas
                  </AdminChip>
                </div>
                {detail.data.sin_contenido ? (
                  <ContentBanner tone="info">
                    Este curso aún no tiene contenido obligatorio publicado.
                  </ContentBanner>
                ) : (
                  detail.data.materias.map((entry, index) => (
                    <section
                      key={entry.subject_id}
                      className={`${styles.drawerSubject} ${subjectTone(subjects.find((s) => s.id === entry.subject_id)?.order_index ?? index)}`}
                    >
                      <div className="mb-3 flex items-start gap-2 text-[var(--subject-ink)]">
                        <LearningIcon name={entry.title} />
                        <strong className="text-base">{visualTitle(entry.title)}</strong>
                      </div>
                      <ContentProgressBar
                        label="Avance de la materia"
                        value={entry.porcentaje}
                        complete={entry.completa}
                      />
                      <p>
                        {entry.completados} de {entry.obligatorios_totales} obligatorios
                        completados.
                        {entry.obligatorios_totales === 0 ? " No aporta al global." : ""}
                      </p>
                    </section>
                  ))
                )}
                <p className={styles.help}>
                  El denominador incluye elementos aún no habilitados. La finalización exacta la
                  determina el servidor.
                </p>
              </div>
            ) : null}
          </ContentLoad>
        </Modal>
      ) : null}
    </section>
  );
}
