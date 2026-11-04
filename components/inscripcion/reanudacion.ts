import type { ProgresoSolicitud } from "@/types/inscripcion";

import {
  PASO_CONSENTIMIENTO,
  PASO_DATOS,
  PASO_ESTADO,
  PASO_ESTUDIOS,
  PASO_REVISAR,
  type PasoId,
} from "./pasos/tipos";

// Paso al que se reanuda tras verificar el correo. Una solicitud enviada, aprobada,
// rechazada o devuelta, o con sesión de solo lectura, abre la pantalla de estado (paso 7);
// un borrador continúa en el primer paso incompleto.
export function pasoSegunProgreso(progreso: ProgresoSolicitud): PasoId {
  if (progreso.estado !== "borrador" || !progreso.puedeEditar) return PASO_ESTADO;
  if (!progreso.consentimientoVigente) return PASO_CONSENTIMIENTO;
  if (
    !progreso.datosGuardados ||
    (progreso.requiereRepresentante && !progreso.representanteCompleto)
  ) {
    return PASO_DATOS;
  }
  if (!progreso.pasosCompletos.estudios) return PASO_ESTUDIOS;
  return PASO_REVISAR;
}
