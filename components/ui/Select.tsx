"use client";

import { AnimatePresence, motion } from "framer-motion";
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
        <label htmlFor={selectId} className="font-sans text-sm font-medium text-text-secondary">
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
            "h-10 w-full appearance-none rounded-sm border border-border bg-bg-surface pl-3 pr-8 font-sans text-sm text-text-primary transition-colors focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue",
            error && "border-accent-red focus:border-accent-red focus:ring-accent-red",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {/* Flecha propia: la nativa del <select> se ve inconsistente entre
            navegadores y no se puede recolorear con appearance-none. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <AnimatePresence>
        {error ? (
          <motion.p
            key="error"
            id={errorId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="font-sans text-sm text-accent-red"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
