import type { ProgresoSolicitud } from "@/types/inscripcion";
import { tieneCertificado } from "./nivelesEstudios";

// Números de paso del flujo: 1 correo, 3 consentimiento, 4 datos, 5 estudios, 6 revisar.
export interface Faltante {
  clave: string;
  texto: string;
  paso: number;
}

export function faltantesSolicitud(progreso: ProgresoSolicitud): Faltante[] {
  const faltantes: Faltante[] = [];
  if (!progreso.pasosCompletos.correo)
    faltantes.push({ clave: "correo", texto: "Verifica tu correo electrónico.", paso: 1 });
  if (!progreso.consentimientoVigente || !progreso.pasosCompletos.consentimiento)
    faltantes.push({
      clave: "consentimiento",
      texto: "Acepta el aviso de privacidad y los términos vigentes.",
      paso: 3,
    });
  if (!progreso.datosGuardados || !progreso.pasosCompletos.datos)
    faltantes.push({ clave: "datos", texto: "Completa tus datos personales.", paso: 4 });
  else if (progreso.requiereRepresentante && !progreso.representanteCompleto)
    faltantes.push({
      clave: "representante",
      texto: "Completa los datos y la autorización de tu representante legal.",
      paso: 4,
    });
  if (progreso.nivelEstudios === "menos_de_decimo")
    faltantes.push({
      clave: "nivel",
      texto: "Tu nivel de estudios no permite inscribirte: necesitas décimo año aprobado.",
      paso: 5,
    });
  else if (!progreso.nivelEstudios || !progreso.pasosCompletos.estudios)
    faltantes.push({
      clave: "nivel",
      texto: "Selecciona tu nivel de estudios.",
      paso: 5,
    });
  else if (
    progreso.documentoRequerido &&
    !tieneCertificado(progreso) &&
    !progreso.documentoEstudiosPendientePorCupo
  )
    faltantes.push({
      clave: "certificado",
      texto: "Sube el certificado de estudios que corresponde a tu nivel.",
      paso: 5,
    });
  return faltantes;
}
