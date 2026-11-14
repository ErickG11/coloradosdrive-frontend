"use client";
import { StudentEmptyState } from "@/components/student-shared/StudentEmptyState";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { buttonClassName } from "@/components/ui/buttonStyles";
import { Toast } from "@/components/inscripcion/Toast";
import { useFetch } from "@/hooks/useFetch";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { whatsappHref } from "@/lib/content/landing";
import type { StudentEnrollmentState } from "@/types/studentEnrollment";
import {
  deadlineInfo,
  documentName,
  documentTargetId,
  isExempt,
  longDate,
  sortedDocuments,
} from "./documentsModel";
import { DocumentBadge, DocumentIcon, DocumentsSkeleton } from "./DocumentsVisual";
import { DocumentCard } from "./DocumentCard";
import { DocumentsDeadline, DocumentsProgress } from "./DocumentsSummary";
import { DocumentsPrint } from "./DocumentsPrint";
import styles from "./documents.module.css";

const schoolContactHref = whatsappHref(
  "Hola, Colorados Drive. Quisiera coordinar la entrega presencial de mis documentos.",
);

export function DocumentsWorkspace() {
  const { data, isLoading, error, refetch } = useFetch<StudentEnrollmentState>(
    "/estudiantes/estado-inscripcion",
  );
  const [message, setMessage] = useState("");
  const [highlighted, setHighlighted] = useState<{ type: string; request: number } | null>(null);
  const highlightTimer = useRef<number | null>(null);
  const previous = useRef<{ enrollmentId: string | null; states: Map<string, string> } | null>(
    null,
  );
  const userId = useCurrentUserId();
  // These existing practice events may change the enrollment's delivery deadline.
  // There is no document-received broadcast in the current backend.
  useRealtimeChannel(userId ? `user-${userId}-practice-slots` : null, {
    "slots-updated": refetch,
    "confirmation-requested": refetch,
    "no-practice": refetch,
  });
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") refetch();
    };
    const interval = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [refetch]);
  useEffect(() => {
    if (!data || error || isLoading) return;
    const timer = window.setTimeout(() => {
      const before = previous.current;
      const received =
        before && before.enrollmentId === data.enrollmentId
          ? data.documentosFisicos.filter(
              (document) =>
                !isExempt(document) &&
                document.estado === "entregado" &&
                before.states.get(document.tipo) === "pendiente",
            )
          : [];
      previous.current = {
        enrollmentId: data.enrollmentId,
        states: new Map(
          data.documentosFisicos.map((document) => [
            document.tipo,
            isExempt(document) ? "exento" : document.estado,
          ]),
        ),
      };
      if (received.length)
        setMessage(
          `${received.length === 1 ? "Documento recibido" : "Documentos recibidos"}: ${received.map(documentName).join(", ")}`,
        );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data, isLoading, error]);
  const deadline = data ? deadlineInfo(data) : null;
  const documents = sortedDocuments(data?.documentosFisicos ?? []);
  const canPrint = Boolean(data && (documents.length > 0 || data.identidadPresencial));
  const applicable = documents.filter((document) => !isExempt(document));
  const complete =
    documents.length > 0 && applicable.every((document) => document.estado === "entregado");
  const urgentContact =
    !complete && deadline?.days !== null && deadline?.days !== undefined && deadline.days <= 2;
  const dominant = complete
    ? "confirmed"
    : deadline?.expired
      ? "missed"
      : urgentContact
        ? "pending-review"
        : "scheduled";
  useEffect(
    () => () => {
      if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current);
    },
    [],
  );
  function selectDocument(type: string) {
    if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current);
    setHighlighted((previous) => ({ type, request: (previous?.request ?? 0) + 1 }));
    requestAnimationFrame(() => {
      const target = document.getElementById(documentTargetId(type));
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "center",
      });
    });
    highlightTimer.current = window.setTimeout(() => setHighlighted(null), 1200);
  }
  return (
    <MotionConfig reducedMotion="user">
      <section className={styles.workspace} data-dominant={dominant}>
        <div className={styles.screenOnly}>
          <header className={styles.header}>
            <div>
              <h1>Documentos para llevar</h1>
              <p>Los entregas en persona en la escuela. No necesitas subir nada en línea.</p>
            </div>
            <div className={styles.headerActions}>
              <Button
                variant="ghost"
                disabled={!canPrint}
                icon={<DocumentIcon kind="print" />}
                onClick={() => window.print()}
              >
                Imprimir mi lista
              </Button>
              {!urgentContact ? (
                <a
                  href={schoolContactHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClassName("ghost", "md", styles.headerContact)}
                >
                  <DocumentIcon kind="whatsapp" />
                  Contactar a la escuela
                </a>
              ) : null}
            </div>
          </header>
          {error ? (
            <div className={styles.error} role="alert">
              <p>
                {data
                  ? "No pudimos actualizar tus documentos. Se muestra la última consulta disponible."
                  : "No pudimos cargar tus documentos. Revisa tu conexión e inténtalo de nuevo."}
              </p>
              <Button variant="secondary" onClick={refetch}>
                Reintentar
              </Button>
            </div>
          ) : null}
          {!data && !error ? (
            <DocumentsSkeleton />
          ) : data ? (
            <div className={styles.content}>
              {documents.length ? (
                <div className={styles.summaryGrid}>
                  <DocumentsProgress
                    documents={data.documentosFisicos}
                    expired={deadline?.expired ?? false}
                    refreshing={isLoading}
                    onRefresh={refetch}
                    onSelect={selectDocument}
                  />
                  <DocumentsDeadline data={data} contactHref={schoolContactHref} />
                </div>
              ) : (
                <StudentEmptyState
                  title="Todavía no tienes documentos pendientes"
                  description="Cuando la escuela prepare tu lista, verás aquí qué necesitas llevar y el estado de cada entrega."
                />
              )}
              {data.identidadPresencial ? (
                <section
                  className={styles.identityCard}
                  data-type="shield"
                  data-state={data.identidadPresencial.confirmada ? "confirmed" : "pending-review"}
                >
                  <span className={styles.identityIcon}>
                    <DocumentIcon kind="shield" />
                  </span>
                  <div>
                    <h2>Verificación en persona</h2>
                    <p>
                      {data.identidadPresencial.confirmada
                        ? "Tu instructor comprobó tu cédula original en persona."
                        : "En tu primera clase tu instructor comprobará tu cédula original. Llévala contigo."}
                    </p>
                    {data.identidadPresencial.confirmada &&
                    data.identidadPresencial.confirmadaAt &&
                    longDate(data.identidadPresencial.confirmadaAt) ? (
                      <p className={styles.identityDate}>
                        Verificada el {longDate(data.identidadPresencial.confirmadaAt)}
                      </p>
                    ) : null}
                  </div>
                  <DocumentBadge
                    label={data.identidadPresencial.confirmada ? "Verificada" : "Pendiente"}
                    tone={data.identidadPresencial.confirmada ? "confirmed" : "pending-review"}
                    icon={data.identidadPresencial.confirmada ? "check" : "clock"}
                  />
                </section>
              ) : null}
              {documents.length ? (
                <section aria-labelledby="documents-list-heading">
                  <div className={styles.listHeader}>
                    <h2 id="documents-list-heading">Lo que necesitas llevar</h2>
                    {data.enrollmentId &&
                    documents.some(
                      (document) => document.estado === "pendiente" && !isExempt(document),
                    ) ? (
                      <p id="documents-personal-note">
                        Marca lo que ya tienes reunido. Es solo para ti y no avisa a la escuela.
                      </p>
                    ) : null}
                  </div>
                  <ul className={styles.documentGrid} aria-label="Lista de documentos">
                    <AnimatePresence initial>
                      {documents.map((document, index) => (
                        <DocumentCard
                          key={document.tipo}
                          document={document}
                          expired={deadline?.expired ?? false}
                          enrollmentId={data.enrollmentId}
                          index={index}
                          highlightRequest={
                            highlighted?.type === document.tipo ? highlighted.request : null
                          }
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              ) : null}
              <details className={styles.steps} open>
                <summary>Cómo funciona</summary>
                <ol>
                  <li>
                    <DocumentIcon kind="gather" />
                    <div>
                      <h3>Reúne tus documentos</h3>
                      <p>Prepara lo que aparece en tu lista.</p>
                    </div>
                  </li>
                  <li>
                    <DocumentIcon kind="school" />
                    <div>
                      <h3>Llévalos a la escuela dentro del plazo</h3>
                    </div>
                  </li>
                  <li>
                    <DocumentIcon kind="check" />
                    <div>
                      <h3>El administrador los marca como recibidos y lo verás aquí</h3>
                    </div>
                  </li>
                </ol>
              </details>
            </div>
          ) : null}
          <div className={styles.toast}>
            <Toast message={message} onDismiss={() => setMessage("")} />
          </div>
        </div>
        {data ? <DocumentsPrint data={data} /> : null}
      </section>
    </MotionConfig>
  );
}
