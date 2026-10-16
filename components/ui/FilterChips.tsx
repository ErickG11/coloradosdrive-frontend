"use client";

export interface FilterChip {
  id: string;
  label: string;
  selected?: boolean;
}

export function FilterChips({
  items,
  onSelect,
  label = "Filtros rápidos",
  removable = false,
}: {
  items: FilterChip[];
  onSelect: (id: string) => void;
  label?: string;
  removable?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={removable ? undefined : Boolean(item.selected)}
          aria-label={removable ? `Quitar filtro: ${item.label}` : undefined}
          onClick={() => onSelect(item.id)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors md:min-h-10 ${item.selected || removable ? "border-border-strong bg-bg-sunken text-text-primary" : "border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary"}`}
        >
          {item.label}
          {removable ? <span aria-hidden="true">×</span> : null}
        </button>
      ))}
    </div>
  );
}
