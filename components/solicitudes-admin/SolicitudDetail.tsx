"use client";
import { useState } from "react";
import { FormError } from "@/components/ui/FormError";
import { useFetch } from "@/hooks/useFetch";
import { solicitudMessage } from "@/lib/api/solicitudes";
import type { PublicCourse } from "@/types/publicCourse";
import { DOCUMENTOS, type SolicitudAdmin, type SolicitudDecision } from "@/types/solicitud";
import { DeleteSolicitud } from "./DeleteSolicitud";
import { ReviewActions } from "./ReviewActions";
import { ReviewOutcome } from "./ReviewOutcome";
import { DocumentViewer } from "./DocumentViewer";
import { SolicitudDrawer } from "./SolicitudDrawer";
import { SolicitudStatus } from "./SolicitudStatus";
import styles from "./solicitudes.module.css";

export function SolicitudDetail({
  solicitud,
  onClose,
  onDone,
  onRefresh,
}: {
  solicitud: SolicitudAdmin;
  onClose: () => void;
  onDone: (message: string, decision?: SolicitudDecision) => void;
  onRefresh?: () => Promise<void>;
}) {
  const { data: courses } = useFetch<PublicCourse[]>("/public/courses");
  const [decision, setDecision] = useState<SolicitudDecision | null>(null);
  const [changed, setChanged] = useState<{
    source: SolicitudAdmin["documentos"];
    documents: SolicitudAdmin["documentos"];
  } | null>(null);
  const [refreshError, setRefreshError] = useState("");
  const consent = solicitud.consentimiento;
  const estado = decision?.estado ?? solicitud.estado;
  const pending = estado === "pendiente_revision";
  const documentsReviewable=["pendiente_revision","aprobada"].includes(estado);
  const documents =
    changed?.source === solicitud.documentos ? changed.documents : solicitud.documentos;
  const course = Array.isArray(courses)
    ? courses.find((c) => c.id === solicitud.courseId)
    : undefined;
  const courseLabel = course ? `Tipo ${course.tipo} — ${course.nombre}` : "Curso no disponible";
  async function refresh(message: string) {
    setRefreshError(message);
    try {
      await onRefresh?.();
    } catch (e) {
      setRefreshError(solicitudMessage(e));
    }
  }
  function finish(message: string, result?: SolicitudDecision) {
    if (result) setDecision(result);
    onDone(message, result);
  }
  return (
    <SolicitudDrawer
      title={`Solicitud de ${solicitud.nombreCompleto}`}
      onClose={onClose}
      header={
        <>
          <p>Cédula · {solicitud.cedula}</p>
          <p className={styles.courseLabel}>{courseLabel}</p>
          <SolicitudStatus estado={estado} />
        </>
      }
    >
      <div className={styles.detail}>
        <FormError>{refreshError}</FormError>
        {decision ? <ReviewOutcome decision={decision} /> : null}
        <section className={styles.section} aria-labelledby="applicant-title">
          <h3 id="applicant-title">Datos del postulante</h3>
          <dl className={styles.dataGrid}>
            {[
              ["Nombre completo", solicitud.nombreCompleto],
              ["Cédula", solicitud.cedula],
              ["Correo", solicitud.correo],
              ["Teléfono", solicitud.telefono ?? "No indicado"],
              ["Nacimiento", solicitud.fechaNacimiento ?? "No indicado"],
              [
                "Fecha de solicitud",
                solicitud.solicitadaAt
                  ? new Date(solicitud.solicitadaAt).toLocaleString("es-EC", {
                      timeZone: "America/Guayaquil",
                    })
                  : "Sin datos guardados",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {consent?.representanteNombre ? (
            <div className={styles.representative}>
              <h4>Representante legal</h4>
              <p>Representante: {consent.representanteNombre}</p>
              <p>Cédula del representante: {consent.representanteCedula}</p>
              <p>Autorización: {consent.representanteAcepta ? "Registrada" : "Pendiente"}</p>
            </div>
          ) : null}
        </section>
        <section className={styles.section} aria-labelledby="consent-title">
          <h3 id="consent-title">Consentimiento</h3>
          {consent ? (
            <div className={styles.detail}>
              <p>Versión: {consent.version}</p>
              <p>
                Aceptado:{" "}
                {new Date(consent.aceptadoAt).toLocaleString("es-EC", {
                  timeZone: "America/Guayaquil",
                })}
              </p>
              {!consent.representanteNombre ? <p>Sin representante registrado.</p> : null}
            </div>
          ) : (
            <p>No hay consentimiento registrado.</p>
          )}
        </section>
        <section className={styles.section} aria-labelledby="documents-title">
          <h3 id="documents-title">Documentos digitales</h3>
          <p className="mb-4"><SolicitudStatus estado={["cedula","titulo_bachiller"].every(tipo=>documents.some(doc=>doc.tipoDocumento===tipo&&doc.documentoId))?"obligatorios_presentes":"obligatorios_incompletos"}/></p>
          <div className={styles.documentList}>
            {DOCUMENTOS.map(({ tipo, label }) => {
              const doc = documents.find((d) => d.tipoDocumento === tipo),
                state = doc?.estado ?? "faltante";
              const hasFile = doc?.documentoId && !["faltante", "no_aplica"].includes(state);
              return (
                <section className={styles.documentCard} aria-label={label} key={tipo}>
                  <h4>{label}</h4>
                  <SolicitudStatus estado={state} />
                  {doc?.motivoRechazo ? (
                    <p className="text-sm text-status-error">Motivo: {doc.motivoRechazo}</p>
                  ) : null}
                  {hasFile ? (
                    <DocumentViewer solicitudId={solicitud.id} documentoId={doc.documentoId!} />
                  ) : null}
                  {documentsReviewable && hasFile && state === "recibido" ? (
                    <ReviewActions
                      key={doc.documentoId}
                      id={solicitud.id}
                      documentoId={doc.documentoId!}
                      onDone={finish}
                      onStale={(message) => void refresh(message)}
                      onDocumentReviewed={(result) =>
                        setChanged({
                          source: solicitud.documentos,
                          documents: documents.map((item) =>
                            item === doc ? { ...item, ...result } : item,
                          ),
                        })
                      }
                    />
                  ) : null}
                </section>
              );
            })}
          </div>
        </section>
        <section className={styles.decisionZone} aria-labelledby="decision-title">
          <h3 id="decision-title">Decisión</h3>
          {pending ? (
            <ReviewActions
              id={solicitud.id}
              onDone={finish}
              onStale={(message) => void refresh(message)}
            />
          ) : (
            <p className="text-sm text-text-secondary">
              La decisión de esta solicitud es definitiva. Los documentos pendientes siguen disponibles para revisión si fue aprobada.
            </p>
          )}
          {solicitud.motivoRechazo ? <p>Motivo: {solicitud.motivoRechazo}</p> : null}
          <p className="text-sm text-text-secondary">
            Los faltantes no bloquean la decisión. El checklist físico se gestiona desde la
            matrícula del alumno.
          </p>
          {estado !== "aprobada" ? (
            <div className={styles.deleteZone}>
              <DeleteSolicitud
                id={solicitud.id}
                cedula={solicitud.cedula}
                onDeleted={() => {
                  onDone("Solicitud eliminada.");
                  onClose();
                }}
              />
            </div>
          ) : null}
        </section>
      </div>
    </SolicitudDrawer>
  );
}
