import type { ReactNode } from "react";
import styles from "./subject-identity.module.css";

export function subjectTone(index: number) {
  return styles[`tone${index % 6}`];
}
export function visualTitle(title: string) {
  if (title !== title.toLocaleUpperCase("es-EC")) return title;
  const lower = title.toLocaleLowerCase("es-EC");
  return lower.charAt(0).toLocaleUpperCase("es-EC") + lower.slice(1);
}

export function LearningIcon({ name, className }: { name: string; className?: string }) {
  const text = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  let drawing: ReactNode;
  if (/check|complet/.test(text)) drawing = <path d="m5 12 4 4L19 6" />;
  else if (/^key$/.test(text))
    drawing = (
      <>
        <circle cx="8" cy="8" r="5" />
        <path d="m12 12 9 9m-4-4 3-3m-6 0 3-3" />
      </>
    );
  else if (/^stats$/.test(text))
    drawing = (
      <>
        <path d="M4 3v18h17M8 17v-6m5 6V6m5 11v-8" />
      </>
    );
  else if (/^users$/.test(text))
    drawing = (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21v-3a7 7 0 0 1 14 0v3m1-17a4 4 0 0 1 0 8m3 9v-3a7 7 0 0 0-2-5" />
      </>
    );
  else if (/^lock$|candado/.test(text))
    drawing = (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
      </>
    );
  else if (/clock|reloj/.test(text))
    drawing = (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    );
  else if (/mecanica/.test(text))
    drawing = <path d="m14 6 4-4a6 6 0 0 1-7 8L4 18a2 2 0 0 0 3 3l8-8a6 6 0 0 0 7-7l-4 4-4-4Z" />;
  else if (/senal/.test(text))
    drawing = (
      <>
        <path d="m12 2 10 16H2L12 2Zm0 5v5m0 3h.01M12 18v4" />
      </>
    );
  else if (/auxilio/.test(text))
    drawing = (
      <>
        <rect x="3" y="5" width="18" height="15" rx="3" />
        <path d="M9 5V3h6v2m-3 5v6m-3-3h6" />
      </>
    );
  else if (/conduccion|defensiv|volante/.test(text))
    drawing = (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <path d="m4 9 5 2m11-2-5 2m-3 4v6" />
      </>
    );
  else if (/practica|ruta/.test(text))
    drawing = (
      <>
        <path d="M7 3v5c0 5 10 3 10 8v5M12 3v4m0 10v4M4 3v4m16 10v4" />
      </>
    );
  else if (/enlace/.test(text))
    drawing = (
      <>
        <path d="m9 15 6-6m-7 3-2 2a4 4 0 0 0 6 6l2-2m-4-12 2-2a4 4 0 0 1 6 6l-2 2" />
      </>
    );
  else if (/examen/.test(text))
    drawing = (
      <>
        <rect x="4" y="4" width="16" height="18" rx="2" />
        <path d="M9 4V2h6v2M8 10h8m-8 4h5m-5 4h3" />
      </>
    );
  else if (/archivo/.test(text))
    drawing = (
      <>
        <path d="M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8m-8 4h6" />
      </>
    );
  else if (/refresh/.test(text))
    drawing = (
      <>
        <path d="M20 7v5h-5M4 17v-5h5m10-3a7 7 0 0 0-12-3l-3 6m16 0-3 6a7 7 0 0 1-12-3" />
      </>
    );
  else if (/arrow/.test(text)) drawing = <path d="M4 12h16m-6-6 6 6-6 6" />;
  else
    drawing = (
      <>
        <path d="M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v16M6 8h2m-2 4h2m8-4h2m-2 4h2" />
      </>
    );
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {drawing}
    </svg>
  );
}
