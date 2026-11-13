"use client";
import { useState } from "react";
import { guayaquilToIso } from "@/lib/utils/content";
import type { AccessDraft } from "@/types/content";

// Solo orientación en pantalla: buildAccessPayload sigue siendo la validación autoritativa al enviar.
export function useDraftChecks(draft: AccessDraft) {
  const [sampledNow] = useState(() => Date.now());
  let opens: string | null = null,
    closes: string | null = null;
  try {
    opens = guayaquilToIso(draft.opens);
  } catch {
    /* El control nativo y la validación al enviar muestran las fechas mal escritas. */
  }
  try {
    closes = guayaquilToIso(draft.closes);
  } catch {
    /* La validación existente al enviar se conserva. */
  }
  return {
    past: Boolean(draft.enabled && closes && Date.parse(closes) <= sampledNow),
    reversed: Boolean(
      draft.enabled && opens && closes && Date.parse(closes) <= Date.parse(opens),
    ),
    attempts:
      draft.attempts !== "" &&
      (!Number.isInteger(Number(draft.attempts)) ||
        Number(draft.attempts) < 1 ||
        Number(draft.attempts) > 20),
    minutes:
      !Number.isInteger(Number(draft.extra)) ||
      Number(draft.extra) < 0 ||
      Number(draft.extra) > 180,
  };
}
