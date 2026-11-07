"use client";

import { forwardRef, useId, type ReactNode } from "react";
import { Input as SharedInput, type InputProps } from "@/components/ui/Input";
import { Select as SharedSelect, type SelectProps } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import styles from "./enrollment-field.module.css";

type Presentation = { help?: ReactNode; helpId?: string };

export function RequiredMark() {
  return (
    <span aria-hidden="true" className={styles.required}>
      *
    </span>
  );
}

// Etiqueta, control, error y ayuda ocupan bloques independientes en flujo normal.
export function EnrollmentField({
  id,
  label,
  required,
  error,
  help,
  helpId,
  children,
}: {
  id: string;
  label?: string;
  required?: boolean;
  error?: string;
  help?: ReactNode;
  helpId?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      {label ? (
        <label htmlFor={id} className={styles.label}>
          {label.replace(/\s*\*$/, "")}
          {required || label.endsWith("*") ? (
            <>
              {" "}
              <RequiredMark />
            </>
          ) : null}
        </label>
      ) : null}
      <div className={styles.control}>{children}</div>
      {error ? (
        <p id={`${id}-error`} role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      {help ? (
        <div id={helpId} className={styles.help}>
          {help}
        </div>
      ) : null}
    </div>
  );
}

function descriptions(
  existing: string | undefined,
  error: string | undefined,
  id: string,
  help: ReactNode,
  helpId: string,
) {
  return (
    [
      ...new Set(
        [existing, error ? `${id}-error` : undefined, help ? helpId : undefined].filter(Boolean),
      ),
    ].join(" ") || undefined
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps & Presentation>(function Input(
  { label, error, help, helpId, id, name, className, "aria-describedby": describedBy, ...props },
  ref,
) {
  const generated = useId();
  const controlId = id ?? name ?? generated;
  const descriptionId = helpId ?? `${controlId}-help`;
  return (
    <EnrollmentField
      id={controlId}
      label={label}
      required={props.required}
      error={error}
      help={help}
      helpId={descriptionId}
    >
      <SharedInput
        {...props}
        ref={ref}
        id={controlId}
        name={name}
        className={cn(className, error && "border-accent-red")}
        aria-invalid={props["aria-invalid"] ?? Boolean(error)}
        aria-describedby={descriptions(describedBy, error, controlId, help, descriptionId)}
      />
    </EnrollmentField>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectProps & Presentation>(function Select(
  { label, error, help, helpId, id, name, className, "aria-describedby": describedBy, ...props },
  ref,
) {
  const generated = useId();
  const controlId = id ?? name ?? generated;
  const descriptionId = helpId ?? `${controlId}-help`;
  return (
    <EnrollmentField
      id={controlId}
      label={label}
      required={props.required}
      error={error}
      help={help}
      helpId={descriptionId}
    >
      <SharedSelect
        {...props}
        ref={ref}
        id={controlId}
        name={name}
        className={cn(className, error && "border-accent-red")}
        aria-invalid={props["aria-invalid"] ?? Boolean(error)}
        aria-describedby={descriptions(describedBy, error, controlId, help, descriptionId)}
      />
    </EnrollmentField>
  );
});
