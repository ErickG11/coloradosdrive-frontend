import type { SolicitudProgress } from "@/types/solicitud";
export type InscripcionStep =
  | "correo"
  | "codigo"
  | "reanudando"
  | "consentimiento"
  | "datos"
  | "documentos"
  | "revision"
  | "estado"
  | "enviado";
export function firstIncompleteStep(p: SolicitudProgress): InscripcionStep {
  if (!p.correoVerificado) return "correo";
  if (["enviada", "aprobada", "archivada", "rechazada"].includes(p.estado)) return "estado";
  if (!p.consentimientoVigente) return "consentimiento";
  if (!p.datosGuardados || (p.requiereRepresentante && !p.representanteCompleto)) return "datos";
  // La entrega de documentos es opcional. Siempre se puede volver para añadir faltantes.
  return "documentos";
}
