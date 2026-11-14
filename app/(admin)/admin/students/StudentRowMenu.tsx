"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { StudentView } from "./StudentDrawer";
import { StudentIcon } from "./StudentVisual";
import styles from "./students.module.css";

const OPTIONS = [
  ["ficha", "Ver ficha", "eye"],
  ["matriculas", "Matrículas", "enrollments"],
  ["documentos", "Documentos", "document"],
  ["editar", "Editar", "edit"],
] as const;

// Menú «⋯ Acciones» de la fila compacta: mismas vistas (?vista=) que los cuatro iconos.
export function StudentRowMenu({
  name,
  href,
  onOpen,
}: {
  name: string;
  href: (view: StudentView) => string;
  onOpen?: (event: MouseEvent<HTMLAnchorElement>, view: StudentView) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    function outside(event: Event) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function close(restore = true) {
    setOpen(false);
    if (restore) trigger.current?.focus();
  }
  function keys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    const items = Array.from(
      root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      event.preventDefault();
      items[(to + items.length) % items.length]?.focus();
    };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(items.length - 1);
    else if (event.key === "Tab") setOpen(false);
  }
  return (
    <div ref={root} className={styles.rowMenu} onKeyDown={keys}>
      <button
        ref={trigger}
        type="button"
        className={styles.rowMenuButton}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Acciones de ${name}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">⋯</span> Acciones
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`Acciones de ${name}`}
          className={styles.rowMenuList}
        >
          {OPTIONS.map(([view, label, icon]) => (
            <Link
              key={view}
              role="menuitem"
              href={href(view)}
              tabIndex={-1}
              onClick={(event) => {
                onOpen?.(event, view);
                close(false);
              }}
            >
              <StudentIcon name={icon} />
              {label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
