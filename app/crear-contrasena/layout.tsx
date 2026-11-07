import type { Metadata } from "next";
import type { ReactNode } from "react";

// El enlace del correo trae un token de un solo uso en la URL: la página no
// se indexa y no envía el Referer a ningún sitio externo.
export const metadata: Metadata = {
  title: "Crear mi contraseña",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function CrearContrasenaLayout({ children }: { children: ReactNode }) {
  return children;
}
