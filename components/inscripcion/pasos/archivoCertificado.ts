// Preparación del certificado en el navegador. Es una ayuda de usabilidad: el servidor vuelve a
// validar firma, tamaño y contenido y re-codifica las imágenes.
export const TAMANO_MAXIMO_BYTES = 2 * 1024 * 1024;
export const LADO_MAXIMO_PX = 1600;
export const CALIDAD_JPEG = 0.8;
// Una foto de cámara pesa varios MiB; se acepta más grande solo para poder comprimirla.
const TAMANO_MAXIMO_ORIGINAL_IMAGEN = 25 * 1024 * 1024;

export type TipoArchivo = "jpeg" | "png" | "pdf";

export interface ArchivoPreparado {
  blob: Blob;
  nombre: string;
}

export class ArchivoRechazado extends Error {}

export async function detectarTipo(archivo: Blob): Promise<TipoArchivo | null> {
  const bytes = new Uint8Array(await archivo.slice(0, 8).arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return "png";
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
    return "pdf";
  return null;
}

export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

async function decodificar(archivo: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    throw new ArchivoRechazado("No pudimos leer la imagen. Prueba con otra foto o con un PDF.");
  }
}

async function comprimirImagen(archivo: File): Promise<Blob> {
  const imagen = await decodificar(archivo);
  const escala = Math.min(1, LADO_MAXIMO_PX / Math.max(imagen.width, imagen.height));
  const ancho = Math.max(1, Math.round(imagen.width * escala));
  const alto = Math.max(1, Math.round(imagen.height * escala));
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const contexto = lienzo.getContext("2d");
  if (!contexto) {
    imagen.close();
    throw new ArchivoRechazado("Tu navegador no pudo procesar la imagen. Sube un PDF.");
  }
  // Fondo blanco: un PNG con transparencia saldría negro en JPEG.
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, ancho, alto);
  contexto.drawImage(imagen, 0, 0, ancho, alto);
  imagen.close();
  const blob = await new Promise<Blob | null>((resolver) =>
    lienzo.toBlob(resolver, "image/jpeg", CALIDAD_JPEG),
  );
  if (!blob) throw new ArchivoRechazado("No pudimos preparar la imagen. Prueba con otra foto.");
  return blob;
}

// Valida tipo y tamaño, y comprime las imágenes (lado mayor 1600 px, JPEG 0,8).
export async function prepararArchivo(archivo: File): Promise<ArchivoPreparado> {
  if (archivo.size === 0) throw new ArchivoRechazado("El archivo está vacío.");
  const tipo = await detectarTipo(archivo);
  if (!tipo) throw new ArchivoRechazado("Solo se aceptan fotos JPG o PNG y archivos PDF.");

  if (tipo === "pdf") {
    if (archivo.size > TAMANO_MAXIMO_BYTES)
      throw new ArchivoRechazado("El PDF supera el máximo de 2 MiB. Sube uno más liviano.");
    return { blob: archivo, nombre: archivo.name };
  }

  if (archivo.size > TAMANO_MAXIMO_ORIGINAL_IMAGEN)
    throw new ArchivoRechazado("La imagen es demasiado grande. Sube una foto más liviana.");
  const comprimido = await comprimirImagen(archivo);
  if (comprimido.size > TAMANO_MAXIMO_BYTES)
    throw new ArchivoRechazado("La imagen sigue superando 2 MiB. Sube una foto más liviana.");
  const base = archivo.name.replace(/\.[^.]*$/, "") || "certificado";
  return { blob: comprimido, nombre: `${base}.jpg` };
}
