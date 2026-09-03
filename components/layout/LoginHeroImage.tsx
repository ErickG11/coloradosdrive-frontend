"use client";

import Image from "next/image";
import { useState } from "react";

// Imagen decorativa de la columna izquierda del login. Si
// /public/images/login-hero.jpg todavía no existe (caso normal antes de que
// alguien la suba), el layout no se rompe: onError cambia a un degradado con
// los colores de la paleta en vez de mostrar el ícono roto del navegador.
// Ver README para las dimensiones recomendadas.
export function LoginHeroImage() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        aria-hidden="true"
        className="h-full w-full bg-gradient-to-br from-accent-blue/25 via-bg-canvas to-accent-red/20"
      />
    );
  }

  return (
    <Image
      src="/images/login-hero.jpg"
      alt=""
      fill
      priority
      sizes="50vw"
      className="object-cover"
      onError={() => setFailed(true)}
    />
  );
}
