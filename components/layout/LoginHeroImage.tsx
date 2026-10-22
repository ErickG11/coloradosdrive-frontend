// Columna izquierda decorativa del login: solo degradado con los colores de
// la paleta. Cuando exista una imagen definitiva, se agrega aquí (por ejemplo
// con next/image y `fill` dentro de este contenedor); mientras tanto no se
// pide ningún recurso, así /login no genera 404 ni errores en consola.
export function LoginHeroImage() {
  return (
    <div
      aria-hidden="true"
      className="h-full w-full bg-gradient-to-br from-accent-blue/25 via-bg-canvas to-accent-red/20"
    />
  );
}
