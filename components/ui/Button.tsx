"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactElement } from "react";
import { buttonClassName, type ButtonSize, type ButtonVariant } from "./buttonStyles";

export { buttonClassName } from "./buttonStyles";
export type { ButtonSize, ButtonVariant } from "./buttonStyles";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: ReactElement;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    isLoading = false,
    disabled,
    icon,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={buttonClassName(variant, size, className)}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            aria-hidden="true"
            className="h-4 w-4 motion-safe:animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="40 56"
            />
          </svg>
          <span role="status">Cargando…</span>
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
});
