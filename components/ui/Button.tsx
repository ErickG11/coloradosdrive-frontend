"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
>;

export interface ButtonProps extends NativeButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

// danger reutiliza el rojo de acento (no un rojo aparte): la paleta se
// mantiene cerrada a 4 colores, así que la intención "destructiva" se
// distingue por el tono más oscuro (accent-red-hover como relleno base) y,
// sobre todo, por el texto del botón — no por un color nuevo.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent-red text-white hover:bg-accent-red-hover disabled:opacity-50",
  secondary:
    "bg-bg-field text-text-primary border border-border hover:border-border-strong disabled:opacity-50",
  danger: "bg-accent-red-hover text-white hover:brightness-90 disabled:opacity-50",
  ghost: "bg-transparent text-text-primary hover:bg-bg-sunken disabled:opacity-40",
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
    "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas disabled:cursor-not-allowed",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", isLoading = false, disabled, children, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      disabled={disabled || isLoading}
      whileHover={disabled || isLoading ? undefined : { scale: 1.02 }}
      whileTap={disabled || isLoading ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className={buttonClassName(variant, size, className)}
      {...props}
    >
      {isLoading ? "Cargando..." : children}
    </motion.button>
  );
});
