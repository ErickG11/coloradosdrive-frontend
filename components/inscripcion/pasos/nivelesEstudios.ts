import type {
  DatosSolicitudInput,
  NivelEstudios,
  ProgresoSolicitud,
  SubtipoCertificado,
} from "@/types/inscripcion";

// Presentación de los niveles de estudios. El servidor valida el catálogo y las reglas de archivo.
export type RequisitoArchivo = "ninguno" | "opcional" | "obligatorio";

export interface InfoNivel {
  nivel: NivelEstudios;
  titulo: string;
  ayuda: string;
  archivo: RequisitoArchivo;
  subtipos: { valor: SubtipoCertificado; etiqueta: string }[];
}

const OPCIONES: InfoNivel[] = [
  {
    nivel: "bachiller",
    titulo: "Bachiller, graduado hace 12 meses o más",
    ayuda:
      "Verificamos tu título en el Ministerio de Educación. No necesitas subir ningún archivo.",
    archivo: "ninguno",
    subtipos: [],
  },
  {
    nivel: "bachiller_reciente",
    titulo: "Bachiller, graduado hace menos de 12 meses",
    ayuda:
      "Tu título puede tardar en aparecer en el Ministerio. Te recomendamos subir el acta de grado o una copia del título.",
    archivo: "opcional",
    subtipos: [
      { valor: "acta_grado", etiqueta: "Acta de grado" },
      { valor: "copia_titulo", etiqueta: "Copia del título" },
    ],
  },
  {
    nivel: "bachiller_exterior",
    titulo: "Bachiller con estudios en el exterior",
    ayuda: "Sube la resolución de homologación del Ministerio de Educación.",
    archivo: "obligatorio",
    subtipos: [{ valor: "resolucion_homologacion", etiqueta: "Resolución de homologación" }],
  },
  {
    nivel: "decimo_aprobado",
    titulo: "Décimo año aprobado",
    ayuda:
      "Incluye a quienes ahora cursan el bachillerato. Sube el certificado de promoción de décimo año con sello de la institución.",
    archivo: "obligatorio",
    subtipos: [{ valor: "certificado_promocion", etiqueta: "Certificado de promoción de 10.º" }],
  },
  {
    nivel: "menos_de_decimo",
    titulo: "Menos de décimo año",
    ayuda: "Para inscribirte necesitas haber aprobado al menos décimo año.",
    archivo: "ninguno",
    subtipos: [],
  },
];

export const NIVELES = [
  "menos_de_decimo",
  "decimo_aprobado",
  "bachiller_reciente",
  "bachiller",
  "bachiller_exterior",
].map((nivel) => OPCIONES.find((opcion) => opcion.nivel === nivel)!);

export const etiquetaNivel = (nivel: NivelEstudios | null): string =>
  NIVELES.find((n) => n.nivel === nivel)?.titulo ?? "Sin completar";

export const infoNivel = (nivel: NivelEstudios | ""): InfoNivel | undefined =>
  NIVELES.find((n) => n.nivel === nivel);

// El servidor informa el certificado en `documentos` (tipo certificado_estudios).
export function tieneCertificado(progreso: ProgresoSolicitud): boolean {
  return progreso.documentos.some(
    (d) => d.tipo === "certificado_estudios" && d.estado !== "faltante",
  );
}

// Datos ya guardados más el nivel elegido, para volver a enviarlos al servidor.
export function datosConNivel(
  progreso: ProgresoSolicitud,
  nivel: Exclude<NivelEstudios, "menos_de_decimo">,
): DatosSolicitudInput | null {
  const d = progreso.datos;
  if (
    !d.nombres ||
    !d.apellidos ||
    !d.cedula ||
    !d.fechaNacimiento ||
    !d.telefono ||
    !d.nacionalidadTipo ||
    !d.tipoSangre
  )
    return null;
  return {
    nombres: d.nombres,
    apellidos: d.apellidos,
    cedula: d.cedula,
    fechaNacimiento: d.fechaNacimiento.slice(0, 10),
    telefono: d.telefono,
    nacionalidadTipo: d.nacionalidadTipo,
    tipoSangre: d.tipoSangre,
    nivelEstudios: nivel,
    ...(d.representante
      ? {
          representante: {
            nombre: d.representante.nombre,
            cedula: d.representante.cedula,
            acepta: true as const,
          },
        }
      : {}),
  };
}
