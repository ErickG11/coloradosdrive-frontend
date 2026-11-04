"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { getUrlCertificado } from "@/lib/api/inscripcion";
import type { SolicitudAdminDetalle, UrlCertificado } from "@/types/inscripcion";
import { adminErrorMessage } from "./adminErrors";
import { ETIQUETA_SUBTIPO, formatearFecha } from "./catalogo";
import styles from "./solicitudes.module.css";

function tamanoLegible(bytes: number | null): string {
  if (bytes === null) return "tamaño desconocido";
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// El enlace firmado (300 s) se pide solo cuando el admin pulsa «Ver»: nunca se precarga ni se
// guarda. Al vencer se descarta y hay que pedirlo de nuevo.
export function CertificadoPanel({ detalle }: { detalle: SolicitudAdminDetalle }) {
  const [enlace, setEnlace] = useState<UrlCertificado | null>(null),
    [error, setError] = useState(""),
    [ocupado, setOcupado] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    if (!enlace) return;
    const timer = setTimeout(() => setEnlace(null), Math.min(enlace.expiresIn, 300) * 1000);
    return () => clearTimeout(timer);
  }, [enlace]);

  async function ver() {
    if (lock.current) return;
    lock.current = true;
    setOcupado(true);
    setError("");
    setEnlace(null);
    try {
      setEnlace(await getUrlCertificado(detalle.id));
    } catch (e) {
      setError(adminErrorMessage(e));
    } finally {
      lock.current = false;
      setOcupado(false);
    }
  }

  const certificado = detalle.certificado;
  return (
    <section className={styles.section} aria-labelledby="certificado-title">
      <h3 id="certificado-title">Certificado de estudios</h3>
      {certificado ? (
        <div className={styles.detail}>
          <p>
            {certificado.subtipo ? ETIQUETA_SUBTIPO[certificado.subtipo] : "Certificado"} ·{" "}
            {tamanoLegible(certificado.tamano)} · subido el {formatearFecha(certificado.uploadedAt)}
          </p>
          <div className={styles.controls}>
            <Button variant="secondary" isLoading={ocupado} onClick={() => void ver()}>
              Ver
            </Button>
          </div>
          <FormError>{error}</FormError>
          {enlace ? (
            <div className={styles.detail}>
              <a
                className="inline-flex min-h-11 items-center underline"
                href={enlace.url}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
              >
                Abrir certificado en otra pestaña
              </a>
              <p className="text-sm text-text-secondary">
                Enlace de descarga válido por 5 minutos. Pulsa Ver para pedir uno nuevo.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className={styles.note}>
          {detalle.documentoEstudiosPendientePorCupo
            ? "El postulante no pudo subir el certificado por el tope diario. No se puede aprobar así: usa «Devolver» con «Requiere documento de estudios»."
            : detalle.documentoRequerido
              ? "Este nivel de estudios exige un certificado y todavía no hay archivo."
              : "Este nivel de estudios no requiere certificado: se verifica en el portal del Ministerio."}
        </p>
      )}
    </section>
  );
}
