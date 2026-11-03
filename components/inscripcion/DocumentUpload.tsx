"use client";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { DocumentoTipo } from "@/types/solicitud";
import styles from "./inscripcion.module.css";

const STATES: Record<
  string,
  { label: string; tone: "warning" | "info" | "success" | "error" | "neutral" }
> = {
  recibido: { label: "Subido (en revisión)", tone: "info" },
  aprobado: { label: "Aprobado", tone: "success" },
  rechazado: { label: "Rechazado", tone: "error" },
  no_aplica: { label: "No aplica", tone: "neutral" },
};

export function DocumentUpload({
  tipo,
  label,
  estado,
  busy,
  error,
  reason,
  onFile,
  obligatorio,
  displayStatus,
}: {
  tipo: DocumentoTipo;
  label: string;
  estado?: string;
  busy?: boolean;
  error?: string;
  reason?: string;
  onFile: (file: File) => void;
  obligatorio?: boolean;
  displayStatus?: string;
}) {
  const id = useId(),
    input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null),
    [dragging, setDragging] = useState(false);
  const disabled = busy || estado === "aprobado" || estado === "no_aplica";
  const status = busy
    ? { label: "Subiendo", tone: "info" as const }
    : (STATES[estado ?? ""] ?? { label: "Pendiente de entrega", tone: "warning" as const });
  function choose(file?: File) {
    if (!file || disabled) return;
    setFile(file);
    onFile(file);
  }
  return (
    <section className={styles.documentSlot} data-invalid={Boolean(error)} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>
        <label htmlFor={id}>{label}</label>
      </h3>
      {obligatorio!==undefined?<p className="text-xs font-semibold text-text-secondary">{obligatorio?"Obligatorio":"Opcional por ahora, se entrega en la escuela"}</p>:null}
      <div role="status">
        <StatusBadge status={estado ?? "faltante"} label={busy?status.label:displayStatus??status.label} tone={status.tone} />
      </div>
      <div
        className={styles.uploadZone}
        data-dragging={dragging}
        aria-disabled={disabled || undefined}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          choose(event.dataTransfer.files[0]);
        }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 16V3m0 0L7 8m5-5 5 5M4 15v5h16v-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p>
          {file
            ? file.name
            : estado === "recibido"
              ? "Documento enviado para revisión"
              : "Arrastra y suelta tu archivo aquí"}
        </p>
        {file ? (
          <p className={styles.fileSize}>
            {file.size < 1024
              ? `${file.size} bytes`
              : file.size < 1024 * 1024
                ? `${(file.size / 1024).toFixed(1)} KiB`
                : `${(file.size / (1024 * 1024)).toFixed(2)} MiB`}
          </p>
        ) : null}
        <input
          ref={input}
          id={id}
          className={styles.fileInput}
          type="file"
          accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={[`${id}-help`, error ? `${id}-error` : "", reason ? `${id}-reason` : ""]
            .filter(Boolean)
            .join(" ")}
          onChange={(event) => {
            choose(event.currentTarget.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          {file || estado === "recibido" || estado === "rechazado"
            ? "Reemplazar archivo"
            : "Seleccionar archivo"}
        </Button>
        <p id={`${id}-help`} className={styles.fileSize}>
          JPG, PNG o PDF · Máximo 5 MiB
        </p>
      </div>
      {reason ? (
        <p id={`${id}-reason`} className="text-sm text-status-error">
          Motivo: {reason}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-status-error">
          {error}
        </p>
      ) : null}
      {tipo === "papeleta_votacion" ? (
        <p className={styles.fileSize}>No se exige desde los 65 años cumplidos.</p>
      ) : null}
    </section>
  );
}
