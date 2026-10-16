import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
}
export function Card({ className, title, children, ...props }: CardProps) {
  return (
    <div
      className={cn("min-w-0 rounded-md border border-border bg-bg-surface p-5 md:p-6", className)}
      {...props}
    >
      {title ? (
        <h2 className="mb-5 text-balance font-display text-xl font-semibold tracking-tight text-text-primary">
          {title}
        </h2>
      ) : null}
      {children}
    </div>
  );
}
