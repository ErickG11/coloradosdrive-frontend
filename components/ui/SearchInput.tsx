"use client";

import { forwardRef, useEffect, useRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value"> {
  label: string;
  value: string;
  onClear: () => void;
  shortcut?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { label, value, onClear, shortcut = false, className, id, name = "search", ...props },
  forwardedRef,
) {
  const input = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!shortcut) return;
    function handleKey(event: KeyboardEvent) {
      const target = event.target;
      if (
        event.key !== "/" ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            target.closest("input,textarea,select,[role='textbox'],[role='dialog']")))
      )
        return;
      event.preventDefault();
      input.current?.focus();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [shortcut]);
  return (
    <div className="relative min-w-0">
      <label className="sr-only" htmlFor={id ?? name}>
        {label}
      </label>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-text-secondary"
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>
      <input
        {...props}
        ref={(node) => {
          input.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        id={id ?? name}
        name={name}
        type="search"
        autoComplete="off"
        spellCheck={false}
        value={value}
        aria-keyshortcuts={shortcut ? "/" : undefined}
        className={cn(
          "h-12 w-full min-w-0 appearance-none rounded-sm border border-border-strong bg-bg-field pl-11 text-base text-text-primary placeholder:text-text-secondary focus-visible:border-focus [&::-webkit-search-cancel-button]:appearance-none",
          value ? "pr-14" : "pr-2 sm:pr-14",
          className,
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => {
            onClear();
            input.current?.focus();
          }}
          className="absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm text-text-secondary hover:bg-bg-sunken hover:text-text-primary"
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : shortcut ? (
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-sans text-xs text-text-secondary sm:block"
        >
          /
        </kbd>
      ) : null}
    </div>
  );
});
