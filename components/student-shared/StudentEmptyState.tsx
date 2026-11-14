import Link from "next/link";
import type { ReactNode } from "react";
import { EnrollmentIcon } from "@/components/inscripcion/EnrollmentVisual";
import { buttonClassName } from "@/components/ui/buttonStyles";
import { landingContent } from "@/lib/content/landing";
export function StudentEmptyState({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  const contact = landingContent.whatsapp[0]?.href;
  return (
    <section className="grid justify-items-center gap-4 rounded-md border border-border bg-bg-surface px-5 py-10 text-center text-text-primary sm:px-8">
      <span
        aria-hidden="true"
        className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-tint text-brand-ink [&_svg]:h-9 [&_svg]:w-9"
      >
        {icon ?? <EnrollmentIcon name="document" />}
      </span>
      <h2 className="max-w-lg text-balance font-display text-xl font-semibold">{title}</h2>
      <p className="max-w-md text-pretty text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {actions ?? (
          <>
            <Link href="/student/inscripcion" className={buttonClassName("secondary")}>
              Ir a Mi inscripción
            </Link>
            {contact ? (
              <a
                href={contact}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClassName("ghost")}
              >
                Escribir a la escuela por WhatsApp
              </a>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
