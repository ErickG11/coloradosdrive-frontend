"use client";

import { AnimatePresence, motion } from "framer-motion";
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, id, name, ...props },
  ref,
) {
  const inputId = id ?? name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={inputId} className="font-sans text-sm font-medium text-text-secondary">
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
          "h-10 rounded-sm border border-border bg-bg-surface px-3 font-sans text-sm text-text-primary placeholder:text-text-disabled transition-colors focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue",
          error && "border-accent-red focus:border-accent-red focus:ring-accent-red",
          className,
        )}
        {...props}
      />
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
