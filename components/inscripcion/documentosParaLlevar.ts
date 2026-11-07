import type {
  DocumentoFisicoEstado,
  EstadoInscripcionAlumno,
  EstadoDocumentoFisico,
  TipoDocumentoFisico,
} from "@/types/inscripcion";

export const ETIQUETA_DOCUMENTO: Record<TipoDocumentoFisico, string> = {
  tipo_sangre: "Carné de tipo de sangre de la Cruz Roja",
  papeleta_votacion: "Certificado de votación",
  titulo_bachiller: "Original del certificado de estudios",
  cedula: "Cédula original para cotejo",
};

export const ETIQUETA_ESTADO: Record<EstadoDocumentoFisico, string> = {
  pendiente: "Pendiente",
  entregado: "Entregado",
  exento: "No aplica",
};

export function etiquetaDocumento(tipo: TipoDocumentoFisico): string {
  return ETIQUETA_DOCUMENTO[tipo] ?? tipo;
}

// Documentos que el alumno todavía debe llevar a la escuela.
export function documentosPorLlevar(estado: EstadoInscripcionAlumno): DocumentoFisicoEstado[] {
  return estado.documentosFisicos.filter((d) => d.estado === "pendiente" && !d.exento);
}

export function formatearFechaLimite(fecha: string): string {
  return new Date(`${fecha.slice(0, 10)}T12:00:00-05:00`).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
  });
}

export function textoPlazo(dias: number): string {
  if (dias > 1) return `Te quedan ${dias} días para entregar los documentos.`;
  if (dias === 1) return "Te queda 1 día para entregar los documentos.";
  if (dias === 0) return "Hoy vence el plazo. Entrega tus documentos.";
  const atras = Math.abs(dias);
  return `El plazo venció hace ${atras} ${atras === 1 ? "día" : "días"}. Contacta a la escuela para entregar lo pendiente.`;
}
