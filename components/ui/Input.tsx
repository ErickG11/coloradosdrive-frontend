"use client";

import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";

import { useValidationMessages } from "@/hooks/useValidationMessages";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

// Los campos de formulario se mantienen casi sólidos (bg-field, no vidrio):
// el glassmorphism vive en Card/Navbar/fondos decorativos, no en los
// controles donde la legibilidad manda.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    label,
    error,
    id,
    name,
    autoComplete = "off",
    spellCheck,
    onInvalid,
    onInput,
    "aria-describedby": describedBy,
    ...props
  },
  ref,
) {
  const validation = useValidationMessages<HTMLInputElement>({ onInvalid, onInput });
  const generatedId = useId();
  const inputId = id ?? name ?? generatedId;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  // Una descripción propia (p. ej. una ayuda) se combina con la del error.
  const describedByIds = [describedBy, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        name={name}
        autoComplete={autoComplete}
        spellCheck={spellCheck ?? (props.type === "email" ? false : undefined)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedByIds}
        className={cn(
          "h-11 min-w-0 w-full rounded-sm border border-border-strong bg-bg-field px-3 text-sm text-text-primary placeholder:text-text-disabled transition-colors focus-visible:border-focus md:h-10",
          error && "border-accent-red",
          className,
        )}
        {...props}
        onInvalid={validation.onInvalid}
        onInput={validation.onInput}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-accent-red">
          {error}
        </p>
      ) : null}
    </div>
  );
});
