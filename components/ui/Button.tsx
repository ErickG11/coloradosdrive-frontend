"use client";

import { motion } from "framer-motion";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

// Se omiten los handlers de drag/animation nativos de HTML: sus firmas
// chocan con las que espera motion.button (framer-motion reutiliza esos
// mismos nombres para sus propios gestos), y no se usan en un botón.
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
>;

export interface ButtonProps extends NativeButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

// Rojo = acento principal (CTA/primario Y destructivo, por diseño: la
// paleta cerrada solo tiene un rojo). "danger" se diferencia de
// "primary" con un borde extra — mismo peso visual, pero más serio.
// Azul marino = acento secundario, para acciones que no son la
// principal de la pantalla pero tampoco son "de salida" (ghost).
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-red text-text-primary hover:bg-accent-red-hover disabled:bg-accent-red/40 focus-visible:ring-accent-blue",
  secondary:
    "bg-accent-blue text-text-primary hover:bg-accent-blue-hover disabled:bg-accent-blue/40 focus-visible:ring-accent-blue",
  danger:
    "border border-accent-red-hover bg-accent-red text-text-primary hover:bg-accent-red-hover disabled:border-transparent disabled:bg-accent-red/40 focus-visible:ring-accent-red",
  ghost:
    "bg-transparent text-text-primary hover:bg-bg-surface-raised disabled:text-text-disabled focus-visible:ring-accent-blue",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

// Exportado para estilizar elementos que se ven como Button pero no pueden
// serlo (p. ej. un <Link> de navegación no debe anidar un <button>).
export function buttonClassName(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-sm font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas disabled:cursor-not-allowed",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", isLoading = false, disabled, children, ...props },
  ref,
) {
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      ref={ref}
      disabled={isDisabled}
      className={buttonClassName(variant, size, className)}
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      {...props}
    >
      {isLoading ? "Cargando..." : children}
    </motion.button>
  );
});
