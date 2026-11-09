"use client";
import { useEffect, useId, useRef, type ReactNode, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LearningIcon } from "@/components/learning/SubjectIdentity";
import styles from "./admin-content.module.css";

export function ContentTabs<T extends string>({
  value,
  items,
  onChange,
  segmented = false,
  label,
}: {
  value: T;
  items: { value: T; label: string; icon?: string; count?: number }[];
  onChange: (value: T) => void;
  segmented?: boolean;
  label?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const container = root.current;
    const selected = container?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (!container || !selected || container.scrollWidth <= container.clientWidth) return;
    const selectedRect = selected.getBoundingClientRect(),
      containerRect = container.getBoundingClientRect();
    if (selectedRect.left < containerRect.left)
      container.scrollLeft -= containerRect.left - selectedRect.left + 8;
    else if (selectedRect.right > containerRect.right)
      container.scrollLeft += selectedRect.right - containerRect.right + 8;
  }, [value]);
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const current = items.findIndex((item) => item.value === value);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
    onChange(items[next].value);
    event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }
  return (
    <div
      ref={root}
      data-count={items.length}
      role="tablist"
      aria-label={label ?? (segmented ? "Tipo de curso" : "Secciones de contenido")}
      className={segmented ? styles.segmented : styles.tabs}
      onKeyDown={navigate}
    >
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          type="button"
          aria-selected={value === item.value}
          aria-controls={segmented ? undefined : `content-panel-${item.value}`}
          id={segmented ? undefined : `content-tab-${item.value}`}
          tabIndex={value === item.value ? 0 : -1}
          onClick={(event) => {
            onChange(item.value);
            const button = event.currentTarget;
            const container = root.current;
            if (container && container.scrollWidth > container.clientWidth) {
              const buttonRect = button.getBoundingClientRect(),
                containerRect = container.getBoundingClientRect();
              if (buttonRect.left < containerRect.left)
                container.scrollLeft -= containerRect.left - buttonRect.left + 8;
              else if (buttonRect.right > containerRect.right)
                container.scrollLeft += buttonRect.right - containerRect.right + 8;
            }
          }}
        >
          {value === item.value ? (
            <motion.span
              className={segmented ? styles.segmentIndicator : styles.tabIndicator}
              layoutId={id}
              initial={false}
              transition={{ duration: reduced ? 0 : 0.16 }}
            />
          ) : null}
          <span className={styles.tabText}>
            {item.icon ? <LearningIcon name={item.icon} /> : null}
            {item.label}
            {item.count != null ? <small>{item.count}</small> : null}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ActionMenu({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (ref.current?.open && !ref.current.contains(event.target as Node))
        ref.current.open = false;
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  function keyboard(event: KeyboardEvent<HTMLDetailsElement>) {
    const root = ref.current;
    if (!root) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      root.open = false;
      root.querySelector("summary")?.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const wasOpen = root.open;
    root.open = true;
    const controls = [...root.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter(
      (node) => !node.matches(":disabled"),
    );
    const current = controls.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "Home" || !wasOpen
        ? 0
        : event.key === "End"
          ? controls.length - 1
          : (current + (event.key === "ArrowDown" ? 1 : -1) + controls.length) % controls.length;
    controls[next]?.focus();
  }
  return (
    <details
      ref={ref}
      className={styles.menu}
      onKeyDown={keyboard}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          event.currentTarget.open = false;
      }}
    >
      <summary aria-label={label} aria-haspopup="menu" title={label}>
        <span aria-hidden="true">⋯</span>
      </summary>
      <div
        role="menu"
        aria-label={label}
        className={styles.menuPanel}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button:not(:disabled), a") && ref.current)
            ref.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}

export function AdminMetric({
  label,
  value,
  detail,
  icon = "temario",
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: string;
}) {
  return (
    <div className={styles.metric}>
      <div>
        <span>{label}</span>
        <LearningIcon name={icon} />
      </div>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}
export function ContentBanner({
  children,
  tone = "warning",
}: {
  children: ReactNode;
  tone?: "warning" | "info";
}) {
  return (
    <div className={`${styles.banner} ${tone === "info" ? styles.infoBanner : ""}`}>
      <LearningIcon name={tone === "warning" ? "senal" : "libro"} />
      <div>{children}</div>
    </div>
  );
}
export function AdminEmpty({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIllustration}>
        <LearningIcon name="libro" />
        <span aria-hidden="true">+</span>
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
export function AdminChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "info" | "warning" | "error";
}) {
  return <span className={`${styles.chip} ${styles[tone]}`}>{children}</span>;
}
