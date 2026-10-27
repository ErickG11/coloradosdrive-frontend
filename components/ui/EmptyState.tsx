import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
  error = false,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : undefined}
      className="flex min-w-0 flex-col items-center gap-3 rounded-md border border-border bg-bg-surface px-5 py-12 text-center"
    >
      <span
        aria-hidden="true"
        className={`flex h-11 w-11 items-center justify-center rounded-full ${error ? "bg-status-error-bg text-status-error" : "bg-bg-sunken text-text-secondary"}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d={
              error
                ? "M12 8v5m0 3h.01M10.3 4.5 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0Z"
                : "M8 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3M8 2h8v4H8zM8 12h8m-8 4h5"
            }
          />
        </svg>
      </span>
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {description ? (
        <p className="max-w-md text-pretty text-sm text-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
