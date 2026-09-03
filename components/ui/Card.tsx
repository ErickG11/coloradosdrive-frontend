import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
}

// Superficie "glass": fondo semi-transparente (bg-surface) + backdrop-blur,
// para que el gradiente decorativo del body se note detrás. Es uno de los
// pocos componentes con vidrio (junto a Navbar/fondos), por eso lleva
// backdrop-blur explícito en vez del bg-field casi sólido de los inputs.
export function Card({ className, title, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-bg-surface p-6 shadow-elevated backdrop-blur-md md:p-8",
        className,
      )}
      {...props}
    >
      {title ? (
        <h2 className="mb-6 font-display text-2xl font-bold tracking-tight text-text-primary">
          {title}
        </h2>
      ) : null}
      {children}
    </div>
  );
}
