import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClassName } from "@/components/ui/Button";

// Mismo estilo secundario de Button, manteniendo la navegación nativa del enlace.
export function EnrollmentActionLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={buttonClassName("secondary", "md", className)} />;
}
