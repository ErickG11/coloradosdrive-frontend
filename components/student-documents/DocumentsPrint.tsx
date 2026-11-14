import Image from "next/image";
import type { StudentEnrollmentState } from "@/types/studentEnrollment";
import { landingContent, landingImages } from "@/lib/content/landing";
import { documentName, documentState, isExempt, longDate, sortedDocuments } from "./documentsModel";
import { DocumentIcon } from "./DocumentsVisual";
import styles from "./documents.module.css";

export function DocumentsPrint({ data }: { data: StudentEnrollmentState }) {
  return (
    <section className={styles.printSheet} aria-label="Lista de documentos para imprimir">
      <header className={styles.printHeader}>
        <Image
          unoptimized
          loading="eager"
          src={landingImages.logo.src}
          width={landingImages.logo.width}
          height={landingImages.logo.height}
          alt={landingImages.logo.alt}
          className={styles.printLogo}
        />
        <div>
          <h1>Documentos para llevar</h1>
          <p>{landingContent.name}</p>
        </div>
      </header>
      <p className={styles.printAddress}>{landingContent.address}</p>
      <div className={styles.printDeadline}>
        <h2>Fecha límite de entrega</h2>
        <p>
          {data.fechaLimite
            ? (longDate(data.fechaLimite) ?? "La escuela te indicará la fecha de entrega.")
            : "La escuela te indicará la fecha de entrega."}
        </p>
      </div>
      <p>Los documentos se entregan en persona. No necesitas subir nada en línea.</p>
      <ul className={styles.printList}>
        {sortedDocuments(data.documentosFisicos).map((document) => (
          <li key={document.tipo}>
            <span className={styles.printCheck} aria-hidden="true">
              {document.estado === "entregado" && !isExempt(document) ? (
                <DocumentIcon kind="check" />
              ) : isExempt(document) ? (
                <DocumentIcon kind="minus" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="4" y="4" width="16" height="16" />
                </svg>
              )}
            </span>
            <div>
              <h3>{documentName(document)}</h3>
              <p>
                {documentState(document, false).label} ·{" "}
                {document.obligatorio && !isExempt(document) ? "Obligatorio" : "Si corresponde"}
              </p>
              {document.destacado ? (
                <p>Presenta el carné de la Cruz Roja para completar tu tipo de sangre.</p>
              ) : null}
              {isExempt(document) ? <p>No se exige para tu caso.</p> : null}
            </div>
          </li>
        ))}
      </ul>
      {data.identidadPresencial ? (
        <section className={styles.printIdentity}>
          <h2>Verificación en persona</h2>
          <p>
            {data.identidadPresencial.confirmada
              ? "Documento verificado. Tu instructor comprobó tu documento de identidad original en persona."
              : "Pendiente. En tu primera clase tu instructor comprobará tu documento de identidad original. Llévalo contigo."}
          </p>
          {data.identidadPresencial.confirmada &&
          data.identidadPresencial.confirmadaAt &&
          longDate(data.identidadPresencial.confirmadaAt) ? (
            <p>Verificada el {longDate(data.identidadPresencial.confirmadaAt)}</p>
          ) : null}
        </section>
      ) : null}
      <footer className={styles.printFooter}>
        El administrador registra la recepción de los documentos en la escuela. Las casillas
        personales no modifican el estado oficial.
      </footer>
    </section>
  );
}
