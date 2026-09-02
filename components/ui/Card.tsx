import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
}

export function Card({ className, title, children, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-lg border border-zinc-200 bg-white p-6 shadow-sm", className)}
      {...props}
    >
      {title ? <h2 className="mb-4 text-lg font-semibold text-zinc-900">{title}</h2> : null}
      {children}
    </div>
  );
}
