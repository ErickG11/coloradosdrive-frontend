"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { DocumentoFisicoEstado } from "@/types/inscripcion";
import {
  documentName,
  documentState,
  documentTargetId,
  isExempt,
  readyStorageKey,
} from "./documentsModel";
import { DocumentBadge, DocumentIcon } from "./DocumentsVisual";
import styles from "./documents.module.css";

function PersonalChecklist({
  enrollmentId,
  document,
}: {
  enrollmentId: string;
  document: DocumentoFisicoEstado;
}) {
  const key = readyStorageKey(enrollmentId, document.tipo);
  const [value, setValue] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setValue(localStorage.getItem(key) === "ready");
      } catch {
        /* Personal preparation works for this visit too. */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [key]);
  return (
    <div className={styles.personalChecklist}>
      <label className={styles.readyControl} data-ready={value || undefined}>
        <input
          className={styles.readyInput}
          type="checkbox"
          checked={value}
          aria-describedby="documents-personal-note"
          onChange={(event) => {
            const checked = event.target.checked;
            setValue(checked);
            try {
              if (checked) localStorage.setItem(key, "ready");
              else localStorage.removeItem(key);
            } catch {
              /* Personal only; never an official update. */
            }
          }}
        />
        <span className={styles.readyIndicator} aria-hidden="true">
          <DocumentIcon
            key={value ? "ready" : "prepare"}
            kind={value ? "check" : "gather"}
            className={styles.smallIcon}
          />
        </span>
        {value ? "Listo para llevar" : "Marcar como listo"}
      </label>
    </div>
  );
}
export function DocumentCard({
  document,
  expired,
  enrollmentId,
  index,
  highlightRequest,
}: {
  document: DocumentoFisicoEstado;
  expired: boolean;
  enrollmentId: string | null;
  index: number;
  highlightRequest: number | null;
}) {
  const state = documentState(document, expired),
    delivered = document.estado === "entregado" && !isExempt(document);
  return (
    <motion.li
      layout="position"
      id={documentTargetId(document.tipo)}
      tabIndex={-1}
      className={styles.documentCard}
      data-state={state.tone}
      data-type={document.tipo}
      data-delivered={delivered || undefined}
      initial={index < 6 ? { opacity: 0.45, transform: "translateY(5px)" } : false}
      animate={{ opacity: 1, transform: "translateY(0)" }}
      transition={{ duration: 0.2, delay: Math.min(index, 5) * 0.025, ease: [0.23, 1, 0.32, 1] }}
    >
      {highlightRequest !== null ? (
        <span key={highlightRequest} className={styles.cardHighlight} aria-hidden="true" />
      ) : null}
      <div className={styles.documentTop}>
        <span className={styles.documentTypeIcon}>
          <DocumentIcon kind={document.tipo} />
          {delivered ? (
            <span className={styles.iconCheck}>
              <DocumentIcon kind="check" className={styles.smallIcon} />
            </span>
          ) : null}
        </span>
        <span className={styles.obligation}>
          {document.obligatorio && !isExempt(document) ? "Obligatorio" : "Si corresponde"}
        </span>
      </div>
      <h3>{documentName(document)}</h3>
      <DocumentBadge {...state} />
      {document.destacado ? (
        <p className={styles.documentHint}>
          Presenta el carné de la Cruz Roja para completar tu tipo de sangre.
        </p>
      ) : null}
      {isExempt(document) ? <p className={styles.documentHint}>No se exige para tu caso.</p> : null}
      {document.estado === "pendiente" && !isExempt(document) && enrollmentId ? (
        <PersonalChecklist
          key={`${enrollmentId}:${document.tipo}`}
          enrollmentId={enrollmentId}
          document={document}
        />
      ) : null}
    </motion.li>
  );
}
