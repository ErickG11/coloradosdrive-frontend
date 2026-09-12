"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactElement } from "react";

import { cn } from "@/lib/utils/cn";

import type { ButtonVariant } from "./Button";

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "title"
>;

export interface IconButtonProps extends NativeButtonProps {
  variant?: ButtonVariant;
  icon: ReactElement;
  /** Obligatorio: es la única forma en que un botón solo-ícono comunica su
   * propósito a un lector de pantalla (RNF-04, sin texto visible). */
  "aria-label": string;
  /** Tooltip nativo para mouse. Por defecto, el mismo texto del aria-label
   * - no hace falta repetirlo si ya describe la acción. */
  title?: string;
  isLoading?: boolean;
}

// Mismo sistema de variantes/colores que Button (VARIANT_CLASSES ahí es
// para texto+padding horizontal; acá el botón es cuadrado). 44x44px de
// área de toque siempre, sin importar el tamaño visual del ícono (20px
// vía className del ícono) - RNF-04 pide que cualquier acción sea
// alcanzable sin dificultad en mobile, no solo en desktop con mouse.
const ICON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent-red text-white hover:bg-accent-red-hover disabled:opacity-50",
  secondary:
    "bg-bg-field text-text-primary border border-border hover:border-border-strong disabled:opacity-50",
  danger: "bg-transparent text-accent-red hover:bg-accent-red-subtle disabled:opacity-40",
  ghost: "bg-transparent text-text-secondary hover:bg-bg-sunken hover:text-text-primary disabled:opacity-40",
};

// Exportado para estilizar elementos que se ven como IconButton pero no
// pueden serlo (un <Link> de "Editar" en una tabla no debe anidar un
// <button>) - mismo patrón que buttonClassName en Button.tsx.
export function iconButtonClassName(variant: ButtonVariant = "ghost", className?: string): string {
  return cn(
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas disabled:cursor-not-allowed",
    ICON_VARIANT_CLASSES[variant],
    className,
  );
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    className,
    variant = "ghost",
    icon,
    isLoading = false,
    disabled,
    "aria-label": ariaLabel,
    title,
    ...props
  },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={disabled || isLoading}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      whileHover={disabled || isLoading ? undefined : { scale: 1.05 }}
      whileTap={disabled || isLoading ? undefined : { scale: 0.95 }}
      transition={{ duration: 0.12 }}
      className={iconButtonClassName(variant, className)}
      {...props}
    >
      {isLoading ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : icon}
    </motion.button>
  );
});

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <circle
        cx="10"
        cy="10"
        r="7.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="34 45.5"
      />
    </svg>
  );
}
