"use client";

import { useId } from "react";
interface Option<T extends string | number> {
  value: T;
  label: string;
}
interface Props<T extends string | number> {
  legend: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}
// Radios nativos: teclado (flechas) y lectores de pantalla sin código extra.
export function SegmentedControl<T extends string | number>({
  legend,
  value,
  options,
  onChange,
  disabled,
}: Props<T>) {
  const name = useId();
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="mb-1 text-sm font-medium text-text-secondary">{legend}</legend>
      <div className="inline-flex max-w-full flex-wrap overflow-hidden rounded-sm border border-border-strong bg-bg-field">
        {options.map((option) => (
          <label key={String(option.value)} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              className="peer sr-only"
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span className="flex min-h-11 min-w-11 items-center justify-center px-4 text-sm font-medium text-text-secondary transition-colors peer-checked:bg-brand-primary peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-brand-ink peer-disabled:cursor-not-allowed peer-disabled:opacity-55 md:min-h-10">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
