"use client";

import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

// Mismo tratamiento "casi sólido" que Input (bg-field, sin vidrio). El
// chevron es un SVG en línea (sin librería de íconos nueva) superpuesto
// sobre un <select appearance-none> para poder estilizarlo con los tokens.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, error, id, name, children, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? name ?? generatedId;
  const errorId = error && selectId ? `${selectId}-error` : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {label ? (
        <label htmlFor={selectId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(
            "h-11 min-w-0 w-full appearance-none rounded-sm border border-border-strong bg-bg-field px-3 pr-9 text-sm text-text-primary transition-colors focus-visible:border-focus md:h-10",
            error && "border-accent-red",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
        >
          <path
            d="M5 7.5 10 12.5 15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-accent-red">
          {error}
        </p>
      ) : null}
    </div>
  );
});
