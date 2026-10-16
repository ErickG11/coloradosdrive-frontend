import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  count,
  actions,
}: {
  title: string;
  description?: ReactNode;
  count?: number;
  actions?: ReactNode;
}) {
  return (
    <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-balance font-display text-2xl font-semibold tracking-tight text-text-primary">
            {title}
          </h1>
          {count !== undefined ? (
            <span
              className="rounded-sm bg-bg-sunken px-2.5 py-1 text-sm font-medium tabular-nums text-text-secondary"
              aria-label={`${count} en total`}
            >
              {count}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-pretty text-sm text-text-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
