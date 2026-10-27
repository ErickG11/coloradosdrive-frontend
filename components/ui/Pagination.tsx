"use client";

import { Button } from "./Button";

export function Pagination({
  total,
  page,
  pageSize = 20,
  singular,
  plural,
  onPageChange,
  disabled = false,
}: {
  total: number;
  page: number;
  pageSize?: number;
  singular: string;
  plural: string;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total ? Math.min((page - 1) * pageSize + 1, total) : 0;
  const last = Math.min(page * pageSize, total);
  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-4 text-sm text-text-secondary"
    >
      <p aria-live="polite" className="tabular-nums">
        {total === 1 ? `1 ${singular}` : `Mostrando ${first}–${last} de ${total} ${plural}`}
      </p>
      <div className="flex items-center gap-2">
        <span className="mr-1 tabular-nums" aria-label={`Página ${page} de ${pages}`}>
          {page} / {pages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled || page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
