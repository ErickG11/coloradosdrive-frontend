"use client";

import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, error, id, name, children, ...props },
  ref,
) {
  const selectId = id ?? name;
  const errorId = error && selectId ? `${selectId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={selectId} className="text-sm font-medium text-zinc-700">
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={cn(
          "h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
});
