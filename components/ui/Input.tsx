"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

// Los campos de formulario se mantienen casi sólidos (bg-field, no vidrio):
// el glassmorphism vive en Card/Navbar/fondos decorativos, no en los
// controles donde la legibilidad manda.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, id, name, ...props },
  ref,
) {
  const inputId = id ?? name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={cn(
          "h-10 rounded-sm border border-border bg-bg-field px-3 text-sm text-text-primary placeholder:text-text-disabled transition-colors focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue",
          error && "border-accent-red focus:border-accent-red focus:ring-accent-red",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm text-accent-red">
          {error}
        </p>
      ) : null}
    </div>
  );
});
