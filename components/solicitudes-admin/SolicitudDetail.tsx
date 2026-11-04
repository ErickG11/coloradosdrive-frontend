"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { getSolicitudAdmin } from "@/lib/api/inscripcion";
import type { SolicitudAdminDetalle, SolicitudAdminItem } from "@/types/inscripcion";
import { adminErrorMessage } from "./adminErrors";
import { nombreDe } from "./catalogo";
import { CertificadoPanel } from "./CertificadoPanel";
import { ConsentimientoPanel } from "./ConsentimientoPanel";
import { DatosDeclarados } from "./DatosDeclarados";
import { DecisionPanel } from "./DecisionPanel";
import { DeleteSolicitud } from "./DeleteSolicitud";
import { ResultadoDecisionCard } from "./ResultadoDecisionCard";
import type { ResultadoDecision } from "./decisionTipos";
import { SolicitudDrawer } from "./SolicitudDrawer";
import { SolicitudStatus } from "./SolicitudStatus";
import { VerificacionesPanel } from "./VerificacionesPanel";
import styles from "./solicitudes.module.css";

// Panel de detalle. El detalle completo se pide al abrir; mientras llega se muestra el
// encabezado con lo que ya trae la fila de la lista.
export function SolicitudDetail({
  item,
  onClose,
  onChanged,
}: {
  item: SolicitudAdminItem;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detalle, setDetalle] = useState<SolicitudAdminDetalle | null>(null),
    [error, setError] = useState(""),
    [cargando, setCargando] = useState(true);

  // `intento` fuerza una nueva carga desde «Reintentar» y tras acciones del panel.
  const [intento, setIntento] = useState(0),
    [resultado, setResultado] = useState<ResultadoDecision | null>(null);
  const resultadoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    getSolicitudAdmin(item.id)
      .then((result) => {
        if (!vivo) return;
        setDetalle(result);
        setError("");
      })
      .catch((e: unknown) => {
        if (vivo) setError(adminErrorMessage(e));
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [item.id, intento]);

  // Al decidir, el formulario desaparece: el foco pasa al resultado para no perderlo.
  useEffect(() => {
    if (resultado) resultadoRef.current?.focus();
  }, [resultado]);

  const actual = detalle ?? item;
  return (
    <SolicitudDrawer
      title={`Solicitud de ${nombreDe(actual)}`}
      onClose={onClose}
      header={
        <>
          <p>Cédula · {actual.cedula ?? "No registrada"}</p>
          <SolicitudStatus estado={actual.estado} />
        </>
      }
    >
      <div className={styles.detail} aria-busy={cargando}>
        {cargando ? <p role="status">Cargando solicitud…</p> : null}
        <FormError>{error}</FormError>
        {error ? (
          <Button
            variant="secondary"
            onClick={() => {
              setCargando(true);
              setIntento((n) => n + 1);
            }}
          >
            Reintentar
          </Button>
        ) : null}
        {detalle ? (
          <>
            <DatosDeclarados detalle={detalle} />
            <VerificacionesPanel
              detalle={detalle}
              onRegistrada={(verificacion) =>
                setDetalle((previo) =>
                  previo
                    ? { ...previo, verificaciones: [...previo.verificaciones, verificacion] }
                    : previo,
                )
              }
            />
            <CertificadoPanel detalle={detalle} />
            <ConsentimientoPanel consentimiento={detalle.consentimiento} />
            <section className={styles.decisionZone} aria-labelledby="decision-title">
              <h3 id="decision-title">Decisión</h3>
              {resultado ? (
                <ResultadoDecisionCard ref={resultadoRef} resultado={resultado} />
              ) : null}
              <DecisionPanel
                detalle={detalle}
                onDecidida={(decidida) => {
                  setResultado(decidida);
                  setDetalle((previo) =>
                    previo ? { ...previo, estado: decidida.estado } : previo,
                  );
                  onChanged();
                  // Trae los campos de la decisión (motivo, mensaje, nota) para el solo lectura.
                  setIntento((n) => n + 1);
                }}
                onConflicto={() => setIntento((n) => n + 1)}
              />
            </section>
          </>
        ) : null}
        {detalle && detalle.estado !== "aprobada" ? (
          <div className={styles.deleteZone}>
            <DeleteSolicitud
              id={detalle.id}
              cedula={detalle.cedula}
              onDeleted={() => {
                onChanged();
                onClose();
              }}
            />
          </div>
        ) : null}
      </div>
    </SolicitudDrawer>
  );
}
