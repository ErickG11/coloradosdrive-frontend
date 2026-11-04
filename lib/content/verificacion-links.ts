// Portales oficiales donde el admin verifica identidad y estudios por número de cédula
// (principio del flujo: lo que se puede verificar en la fuente no se sube).
export interface EnlaceVerificacion {
  nombre: string;
  url: string;
  // false: la dirección es provisional y la administración debe confirmarla antes de producción.
  confirmado: boolean;
}

export const ENLACE_MINISTERIO_EDUCACION: EnlaceVerificacion = {
  nombre: "Ministerio de Educación",
  url: "https://servicios.educacion.gob.ec/titulacion25-web/faces/paginas/consulta-titulos-refrendados.xhtml",
  confirmado: true,
};

// Valor configurable: es la página institucional, no la consulta de cédula. Marcado para
// confirmar con la administración de la escuela cuál es la dirección de consulta vigente.
export const ENLACE_REGISTRO_CIVIL: EnlaceVerificacion = {
  nombre: "Registro Civil",
  url: "https://www.registrocivil.gob.ec",
  confirmado: false,
};
