import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand-primary text-white hover:bg-brand-hover active:bg-brand-pressed",
  secondary: "border border-border-strong bg-bg-surface text-text-primary hover:bg-bg-sunken",
  danger: "bg-brand-pressed text-white hover:bg-brand-hover",
  ghost: "bg-transparent text-text-secondary hover:bg-bg-sunken hover:text-text-primary",
};
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-sm md:min-h-10",
  md: "min-h-11 px-4 text-sm md:min-h-10",
  lg: "min-h-12 px-6 text-base",
};

export function buttonClassName(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-sm py-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );
}
