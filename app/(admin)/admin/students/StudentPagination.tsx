import { StudentIcon } from "./StudentVisual";
import styles from "./students.module.css";
export function StudentPagination({
  total,
  page,
  onChange,
}: {
  total: number;
  page: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / 20));
  const visible = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  return (
    <nav aria-label="Paginación de alumnos" className={styles.pagination}>
      <p aria-live="polite">
        Mostrando {Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} de {total}{" "}
        alumnos
      </p>
      <div>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Anterior"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <StudentIcon name="back" />
        </button>
        {visible.map((n, i) => (
          <span key={n}>
            {i > 0 && n - visible[i - 1] > 1 && <span className={styles.ellipsis}>…</span>}
            <button
              type="button"
              className={styles.pageNumber}
              aria-label={`Página ${n}`}
              aria-current={n === page ? "page" : undefined}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          </span>
        ))}
        <button
          type="button"
          className={`${styles.iconButton} ${styles.next}`}
          aria-label="Siguiente"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <StudentIcon name="back" />
        </button>
      </div>
    </nav>
  );
}
