import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface FormErrorProps {
  /** Mensaje de error; sin mensaje no se renderiza nada. */
  children?: ReactNode;
  id?: string;
  className?: string;
}

// Error global de un formulario (o de una carga): role="alert" hace que el
// lector de pantalla lo anuncie en cuanto aparece. Los errores de un campo
// concreto van en la prop `error` de Input/Select/Textarea, que ya enlaza
// aria-invalid y aria-describedby; no se muestran los dos para el mismo
// problema.
export function FormError({ children, id, className }: FormErrorProps) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className={cn("text-sm text-accent-red", className)}>
      {children}
    </p>
  );
}
