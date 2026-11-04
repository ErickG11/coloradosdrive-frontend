import type { ProgresoSolicitud } from "@/types/inscripcion";

// Identificadores de los pasos del wizard público /inscripcion, en orden:
// 0 requisitos, 1 correo, 2 código, 3 consentimiento, 4 datos, 5 estudios,
// 6 revisar y enviar, 7 estado y seguimiento.
export type PasoId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const PASO_REQUISITOS: PasoId = 0;
export const PASO_CORREO: PasoId = 1;
export const PASO_CODIGO: PasoId = 2;
export const PASO_CONSENTIMIENTO: PasoId = 3;
export const PASO_DATOS: PasoId = 4;
export const PASO_ESTUDIOS: PasoId = 5;
export const PASO_REVISAR: PasoId = 6;
export const PASO_ESTADO: PasoId = 7;

// Propiedades que el contenedor entrega a cada paso posterior a la verificación del código
// (pasos 3 a 7). El token de la solicitud vive solo en memoria (`sesionSolicitud`): los pasos
// llaman a lib/api/inscripcion.ts y no lo reciben ni lo guardan.
export interface PasoProps {
  solicitudId: string;
  // Último progreso conocido del servidor; null solo mientras se recupera.
  progreso: ProgresoSolicitud | null;
  // Publica un progreso más reciente (tras guardar, subir o enviar).
  onProgreso: (progreso: ProgresoSolicitud) => void;
  // Pasa al paso siguiente.
  onAvanzar: () => void;
  // Vuelve al paso anterior (el contenedor no deja retroceder antes del paso 3).
  onVolver: () => void;
  // Salta a un paso concreto. Si la sesión venció (requiereVerificarCorreoDeNuevo) o el
  // token ya no sirve, llamar irAPaso(1): el contenedor limpia la sesión en memoria.
  irAPaso: (paso: PasoId) => void;
}
