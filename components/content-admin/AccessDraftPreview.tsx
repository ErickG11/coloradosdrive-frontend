"use client";
import { useState } from "react";
import { contentDate, guayaquilToIso } from "@/lib/utils/content";
import type { AccessDraft, ContentScope } from "@/types/content";
import { ContentBanner } from "./AdminContentUI";
import styles from "./admin-content.module.css";

// Advisory display only: buildAccessPayload remains the authoritative submit validation.
export function AccessDraftPreview({
  draft,
  scope,
  targetName,
}: {
  draft: AccessDraft;
  scope: ContentScope;
  targetName?: string;
}) {
  const [sampledNow] = useState(() => Date.now());
  let opens: string | null = null,
    closes: string | null = null;
  try {
    opens = guayaquilToIso(draft.opens);
  } catch {
    /* Native control and existing submit validation show malformed dates. */
  }
  try {
    closes = guayaquilToIso(draft.closes);
  } catch {
    /* Existing submit validation is preserved. */
  }
  const past = draft.enabled && closes && Date.parse(closes) <= sampledNow;
  const reversed = draft.enabled && opens && closes && Date.parse(closes) <= Date.parse(opens);
  const attempts =
    draft.attempts !== "" &&
    (!Number.isInteger(Number(draft.attempts)) ||
      Number(draft.attempts) < 1 ||
      Number(draft.attempts) > 20);
  const minutes =
    !Number.isInteger(Number(draft.extra)) || Number(draft.extra) < 0 || Number(draft.extra) > 180;
  return (
    <>
      <div className={styles.preview} aria-label="Resumen de habilitación">
        <strong>
          {draft.enabled ? "Se habilitará" : "Se bloqueará"} «{scope.title}»
        </strong>
        <p>
          Para {targetName ?? "el destinatario que selecciones"}
          {draft.enabled
            ? ` · ${opens ? `desde ${contentDate(opens)}` : "desde ahora"}${closes ? ` hasta ${contentDate(closes)}` : ", sin fecha de cierre"}`
            : "."}
        </p>
        <small>Vista previa · hora de Ecuador (America/Guayaquil, UTC−5)</small>
      </div>
      <div id="access-close-feedback">
        {past || reversed ? (
          <p role="alert" className="mt-2 text-sm text-status-error">
            {past
              ? "El cierre debe ser una fecha futura."
              : "El cierre debe ser posterior a la apertura."}
          </p>
        ) : null}
      </div>
      {scope.hasExams ? (
        <div className="space-y-1">
          <p
            id="access-attempts-feedback"
            className={`text-sm ${attempts ? "text-status-error" : "text-text-secondary"}`}
          >
            {attempts
              ? "El máximo de intentos debe ser un entero entre 1 y 20."
              : "Intentos: de 1 a 20; vacío conserva el máximo del examen."}
          </p>
          <p
            id="access-minutes-feedback"
            className={`text-sm ${minutes ? "text-status-error" : "text-text-secondary"}`}
          >
            {minutes
              ? "Los minutos extra deben ser un entero entre 0 y 180."
              : "Minutos extra: de 0 a 180. No cambian un intento ya iniciado."}
          </p>
        </div>
      ) : null}
      {past || reversed || attempts || minutes ? (
        <ContentBanner>
          Revisa los campos señalados antes de continuar. La revisión final valida las fechas con la
          hora actual.
        </ContentBanner>
      ) : null}
    </>
  );
}
