"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

export interface DataColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  mobileLabel?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  rowHref,
  rowLabel,
  isLoading = false,
  loadingLabel = "Cargando…",
  error,
  onRetry,
  empty,
  mobileCards = false,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  caption: string;
  rowHref?: (row: T) => string;
  rowLabel?: (row: T) => string;
  isLoading?: boolean;
  loadingLabel?: string;
  error?: string | null;
  onRetry?: () => void;
  empty?: ReactNode;
  mobileCards?: boolean;
}) {
  if (isLoading)
    return (
      <div
        role="status"
        aria-busy="true"
        className="overflow-hidden rounded-md border border-border bg-bg-surface p-4"
      >
        <span className="sr-only">{loadingLabel}</span>
        <div aria-hidden="true" className="flex flex-col gap-3 motion-safe:animate-pulse">
          <div className="h-8 rounded-sm bg-bg-sunken" />
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="flex h-16 items-center gap-4 rounded-sm border border-border px-4"
            >
              <span className="h-9 w-9 rounded-full bg-bg-sunken" />
              <span className="h-3 w-1/3 rounded bg-bg-sunken" />
              <span className="ml-auto h-5 w-16 rounded bg-bg-sunken" />
            </div>
          ))}
        </div>
      </div>
    );
  if (error)
    return (
      <EmptyState
        error
        title="No se pudo cargar el listado"
        description={error}
        action={
          onRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              Reintentar
            </Button>
          ) : undefined
        }
      />
    );
  if (!rows.length)
    return (
      empty ?? (
        <EmptyState
          title="No hay registros"
          description="Los registros aparecerán aquí cuando estén disponibles."
        />
      )
    );
  return (
    <div
      className={cn(
        "data-table relative min-w-0 max-w-full overflow-x-auto rounded-md border border-border bg-bg-surface",
        mobileCards && "data-table--cards",
      )}
    >
      <table className="w-full text-left text-sm" role="table">
        <caption className="sr-only">{caption}</caption>
        <thead role="rowgroup" className="bg-bg-sunken text-text-secondary">
          <tr role="row">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                role="columnheader"
                className={cn("px-4 py-3 font-medium", column.className)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              role="row"
              className={cn(
                "relative border-t border-border transition-colors",
                rowHref && "data-table__linked hover:bg-bg-sunken focus-within:bg-bg-sunken",
              )}
            >
              {columns.map((column, index) =>
                index === 0 ? (
                  <th
                    key={column.key}
                    scope="row"
                    role="rowheader"
                    className={cn("px-4 py-4 font-normal", column.className)}
                  >
                    {rowHref ? (
                      <Link
                        href={rowHref(row)}
                        aria-label={rowLabel?.(row)}
                        className="data-table__row-link block text-text-primary after:absolute after:inset-0"
                      >
                        {column.render(row)}
                      </Link>
                    ) : (
                      column.render(row)
                    )}
                  </th>
                ) : (
                  <td
                    key={column.key}
                    role="cell"
                    data-label={column.mobileLabel === false ? undefined : column.header}
                    className={cn("px-4 py-4 text-text-secondary", column.className)}
                  >
                    {column.render(row)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
