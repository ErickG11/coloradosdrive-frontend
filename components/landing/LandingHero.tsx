"use client";

import { motion } from "motion/react";
import Link from "next/link";

import { buttonClassName } from "@/components/ui/Button";

// Composición del hero (decisión del pase de diseño): dos columnas en
// desktop — copy + CTA a la izquierda, un panel de vidrio con un dial
// abstracto (arco de progreso azul/rojo, los dos acentos de la paleta) a
// la derecha en vez de una foto de stock. Dos chips flotantes adelantan
// datos reales que se detallan más abajo (instructores certificados,
// horario de prácticas) — la animación de entrada anticipa contenido real,
// no es decoración pura. Un solo CTA primario en esta pantalla ("Ver
// cursos"): "Iniciar sesión" ya vive en el header, así no se duplica la
// acción principal (regla `primary-action`).
export function LandingHero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-8 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <span className="text-sm font-medium uppercase tracking-wide text-accent-blue">
          Escuela de conducción
        </span>
        <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight text-text-primary md:text-5xl">
          Conviértete en conductor certificado, con acompañamiento real en cada clase.
        </h1>
        <p className="mt-5 max-w-md text-base text-text-secondary md:text-lg">
          Cursos teóricos y prácticos para motocicletas y vehículos livianos, con instructores
          certificados y horarios de práctica todos los días.
        </p>
        <Link href="#cursos" className={buttonClassName("primary", "lg", "mt-8")}>
          Ver cursos disponibles
        </Link>
      </motion.div>

      <motion.div
        className="relative mx-auto flex h-72 w-72 items-center justify-center md:h-80 md:w-80"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full border border-border bg-bg-surface shadow-elevated backdrop-blur-md">
          <svg viewBox="0 0 200 200" className="h-[85%] w-[85%]" aria-hidden="true">
            <circle
              cx="100"
              cy="100"
              r="82"
              fill="none"
              stroke="var(--color-border-strong)"
              strokeWidth="10"
            />
            <circle
              cx="100"
              cy="100"
              r="82"
              fill="none"
              stroke="var(--color-accent-blue)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="515.2"
              strokeDashoffset="128.8"
              transform="rotate(-90 100 100)"
            />
            <circle
              cx="100"
              cy="100"
              r="58"
              fill="none"
              stroke="var(--color-accent-red)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="364.4"
              strokeDashoffset="255.1"
              transform="rotate(-90 100 100)"
            />
            <text
              x="100"
              y="107"
              textAnchor="middle"
              className="font-display"
              fontSize="30"
              fontWeight="700"
              fill="var(--color-text-primary)"
            >
              A · B
            </text>
          </svg>
        </div>

        <motion.div
          className="absolute -left-6 top-4 rounded-md border border-border bg-bg-surface-raised px-3 py-2 text-xs font-medium text-text-secondary shadow-elevated backdrop-blur-md"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
        >
          Instructores certificados
        </motion.div>

        <motion.div
          className="absolute -right-4 bottom-6 rounded-md border border-border bg-bg-surface-raised px-3 py-2 text-xs font-medium text-text-secondary shadow-elevated backdrop-blur-md"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45, ease: "easeOut" }}
        >
          Prácticas 06:00–22:00
        </motion.div>
      </motion.div>
    </section>
  );
}
