"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DocumentUpload } from "./DocumentUpload";
import { uploadSolicitudDocument, solicitudMessage } from "@/lib/api/solicitudes";
import {
  DOCUMENTOS,
  type DocumentoTipo,
  type SolicitudSession,
  type SolicitudProgress,
} from "@/types/solicitud";
import styles from "./inscripcion.module.css";
const MAX = 5 * 1024 * 1024;
export function documentFileError(file: File): string {
  if (!file.size) return "El archivo está vacío. Selecciona otro.";
  if (file.size > MAX) return "El archivo supera el máximo de 5 MiB.";
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type))
    return "Selecciona un archivo JPG, PNG o PDF.";
  return "";
}
export function DocumentsStep({
  session,
  initialDocuments = [],
  onFinish,
  onNotice,
  onUploaded,
  sent=false,
  missing=[],
}: {
  session: SolicitudSession;
  initialDocuments?: SolicitudProgress["documentos"];
  onFinish: () => void;
  onNotice: (message: string) => void;
  sent?: boolean;
  missing?: DocumentoTipo[];
  onUploaded?: (tipo: DocumentoTipo, estado: string) => void;
}) {
  const [states, setStates] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialDocuments.map((d) => [d.tipo, d.estado])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState<Record<string, boolean>>({});
  const locks = useRef(new Set<string>());
  async function upload(tipo: DocumentoTipo, file: File) {
    const invalid = documentFileError(file);
    setErrors((old) => ({ ...old, [tipo]: invalid }));
    if (invalid || locks.current.has(tipo)) return;
    locks.current.add(tipo);
    setBusy((old) => ({ ...old, [tipo]: true }));
    try {
      const doc = await uploadSolicitudDocument(session, tipo, file);
      setStates((old) => ({ ...old, [tipo]: doc.estado }));
      onUploaded?.(tipo, doc.estado);
      onNotice("Documento recibido.");
    } catch (e) {
      setErrors((old) => ({ ...old, [tipo]: solicitudMessage(e) }));
    } finally {
      locks.current.delete(tipo);
      setBusy((old) => ({ ...old, [tipo]: false }));
    }
  }
  return (
    <div className={styles.form}>
      <p>
        Sube la cédula y el título de bachiller o certificado de décimo para enviar tu solicitud. La papeleta de votación y el tipo de sangre pueden quedar pendientes.
      </p>
      <p id="files-help" className="text-sm text-text-secondary">
        JPG, PNG o PDF. Máximo 5 MiB por archivo. Elegir otro archivo reemplaza el anterior si aún
        no está aprobado.
      </p>
      <div className={styles.documentsGrid}>
        {DOCUMENTOS.map(({ tipo, label }) => (
          <DocumentUpload
            key={tipo}
            tipo={tipo}
            label={label}
            estado={states[tipo]}
            busy={busy[tipo]}
            obligatorio={tipo==="cedula"||tipo==="titulo_bachiller"}
            error={errors[tipo] || (missing.includes(tipo)&&!states[tipo]?"Este documento es obligatorio para enviar.":undefined)}
            reason={
              states[tipo] === "rechazado"
                ? (initialDocuments.find((doc) => doc.tipo === tipo)?.motivoRechazo ?? undefined)
                : undefined
            }
            onFile={(file) => void upload(tipo, file)}
          />
        ))}
      </div>
      <p>La cédula y el título son obligatorios para enviar; los otros dos documentos se pueden entregar después.</p>
      <div className={styles.stepActions}>
        <Button disabled={Object.values(busy).some(Boolean)} onClick={onFinish}>
          {sent?"Volver al estado de mi solicitud":"Revisar y enviar"}
        </Button>
      </div>
    </div>
  );
}
