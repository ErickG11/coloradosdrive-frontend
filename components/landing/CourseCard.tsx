"use client";

import { motion } from "motion/react";
import type { ReactElement } from "react";

import { Card } from "@/components/ui/Card";
import { buttonClassName } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { PublicCourse } from "@/types/publicCourse";

import { CarIcon, MotorcycleIcon } from "./icons";

const TYPE_ICON: Record<PublicCourse["tipo"], ReactElement> = {
  A: <MotorcycleIcon className="h-6 w-6" />,
  B: <CarIcon className="h-6 w-6" />,
};

// Mismo agrupamiento de significado por color que StatusBadge: cada tipo
// de curso tiene su acento fijo (A = azul, B = rojo) para diferenciarlos
// de un vistazo, sin salir de la paleta cerrada.
const TYPE_BADGE_CLASSES: Record<PublicCourse["tipo"], string> = {
  A: "bg-accent-blue-subtle text-accent-blue",
  B: "bg-accent-red-subtle text-accent-red",
};

// La API pública (GET /public/courses) no expone `descripcion` a propósito
// (ver PublicCourse en el backend) — se complementa acá con copy fijo por
// tipo, no por curso, ya que en la práctica solo existen los dos tipos A/B.
const TYPE_DESCRIPTIONS: Record<PublicCourse["tipo"], string> = {
  A: "Clases teóricas y prácticas para conducir motocicleta, de principio a fin.",
  B: "Manejo de vehículos livianos con transmisión manual y automática.",
};

interface CourseCardProps {
  course: PublicCourse;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.15, ease: "easeOut" }}>
      <Card className="flex h-full flex-col">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-md",
            TYPE_BADGE_CLASSES[course.tipo],
          )}
        >
          {TYPE_ICON[course.tipo]}
        </div>

        <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-text-primary">
          {course.nombre}
        </h3>

        {course.horasRequeridas ? (
          <span className="mt-1 text-sm text-text-secondary">
            {course.horasRequeridas} horas requeridas
          </span>
        ) : null}

        <p className="mt-3 flex-1 text-sm text-text-secondary">{TYPE_DESCRIPTIONS[course.tipo]}</p>

        {/* /inscripcion todavía no existe (Fase 7): un enlace a un
           placeholder sería un callejón sin salida, así que el botón queda
           deshabilitado con estado claro en vez de simular una acción que
           no lleva a nada (regla `loading-buttons` / disabled-states). */}
        <button
          type="button"
          disabled
          title="La inscripción en línea estará disponible próximamente"
          className={cn(buttonClassName("secondary", "md"), "mt-6 w-full cursor-not-allowed")}
        >
          Solicitar inscripción — Próximamente
        </button>
      </Card>
    </motion.div>
  );
}
