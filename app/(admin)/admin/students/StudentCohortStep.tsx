"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { SidePanel } from "@/components/ui/SidePanel";
import { Button } from "@/components/ui/Button";
export function StudentCohortStep({
  embedded,
  title,
  children,
  footer,
  onClose,
  busy,
}: {
  embedded?: boolean;
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  busy: boolean;
}) {
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (embedded) back.current?.focus();
  }, [embedded]);
  if (!embedded)
    return (
      <SidePanel title={title} onClose={onClose} closeDisabled={busy} footer={footer}>
        {children}
      </SidePanel>
    );
  return (
    <section aria-label={title} className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
        <Button ref={back} variant="secondary" size="sm" onClick={onClose} disabled={busy}>
          Volver a Matrículas
        </Button>
        <h3 className="my-5 font-display text-xl font-semibold">{title}</h3>
        {children}
      </div>
      <footer className="shrink-0 border-t border-border bg-bg-surface px-5 py-4 sm:px-6">
        {footer}
      </footer>
    </section>
  );
}
