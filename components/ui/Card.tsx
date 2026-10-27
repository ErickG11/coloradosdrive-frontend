import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  /**
   * Nivel del encabezado del título. Por defecto h2; usa "h1" en pantallas
   * cuyo título principal es este Card y no tienen otro h1.
   */
  titleAs?: "h1" | "h2";
}
export function Card({ className, title, titleAs: Heading = "h2", children, ...props }: CardProps) {
  return (
    <div
      className={cn("min-w-0 rounded-md border border-border bg-bg-surface p-5 md:p-6", className)}
      {...props}
    >
      {title ? (
        <Heading className="mb-5 text-balance font-display text-xl font-semibold tracking-tight text-text-primary">
          {title}
        </Heading>
      ) : null}
      {children}
    </div>
  );
}
