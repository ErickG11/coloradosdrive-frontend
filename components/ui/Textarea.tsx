"use client";

import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

// Mismo tratamiento "casi sólido" que Input/Select (bg-field, sin
// vidrio). Se usa para textos más largos que un Input de una línea no
// comunica bien (enunciado de una pregunta, respuesta correcta de texto
// abierto).
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, error, id, name, rows = 3, ...props },
  ref,
) {
  const textareaId = id ?? name;
  const errorId = error && textareaId ? `${textareaId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={textareaId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={textareaId}
        name={name}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={cn(
          "resize-y rounded-sm border border-border bg-bg-field px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled transition-colors focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue",
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
