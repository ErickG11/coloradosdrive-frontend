"use client";
import { useEffect, useId, useRef, useState } from "react";
import { EnrollmentAvatar } from "@/components/inscripcion/EnrollmentVisual";
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
  const [seccion, setSeccion] = useState("informacion");
  const tabsId = useId();
  const secciones = [
    { id: "informacion", label: "Lo que declaró" },
    { id: "verificaciones", label: "Verificaciones" },
    { id: "consentimiento", label: "Consentimiento" },
  ];
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
      avatar={<EnrollmentAvatar name={nombreDe(actual)} large />}
      onClose={onClose}
      footer={
        detalle?.estado === "enviada" ? (
          <DecisionPanel
            detalle={detalle}
            onDecidida={(decidida) => {
              setResultado(decidida);
              setDetalle((previo) => (previo ? { ...previo, estado: decidida.estado } : previo));
              onChanged();
              // Trae los campos de la decisión (motivo, mensaje, nota) para el solo lectura.
              setIntento((n) => n + 1);
            }}
            onConflicto={() => setIntento((n) => n + 1)}
          />
        ) : undefined
      }
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
            <div
              className={styles.detailTabs}
              role="tablist"
              aria-label="Secciones de la solicitud"
            >
              {secciones.map((tab, indice) => (
                <button
                  key={tab.id}
                  id={`${tabsId}-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={seccion === tab.id}
                  aria-controls={`${tabsId}-${tab.id}-panel`}
                  tabIndex={seccion === tab.id ? 0 : -1}
                  onClick={() => setSeccion(tab.id)}
                  onKeyDown={(event) => {
                    let siguiente = indice;
                    if (event.key === "ArrowRight") siguiente = (indice + 1) % secciones.length;
                    else if (event.key === "ArrowLeft")
                      siguiente = (indice + secciones.length - 1) % secciones.length;
                    else if (event.key === "Home") siguiente = 0;
                    else if (event.key === "End") siguiente = secciones.length - 1;
                    else return;
                    event.preventDefault();
                    setSeccion(secciones[siguiente].id);
                    document.getElementById(`${tabsId}-${secciones[siguiente].id}`)?.focus();
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div
              id={`${tabsId}-informacion-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-informacion`}
              hidden={seccion !== "informacion"}
              tabIndex={0}
            >
              <DatosDeclarados detalle={detalle} />
            </div>
            <div
              id={`${tabsId}-verificaciones-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-verificaciones`}
              hidden={seccion !== "verificaciones"}
              tabIndex={0}
            >
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
            </div>

            <div
              id={`${tabsId}-consentimiento-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-consentimiento`}
              hidden={seccion !== "consentimiento"}
              tabIndex={0}
            >
              <ConsentimientoPanel consentimiento={detalle.consentimiento} />
            </div>
            <section
              className={styles.decisionZone}
              aria-labelledby="decision-title"
              hidden={!resultado && detalle.estado === "enviada"}
            >
              <h3 id="decision-title">Decisión</h3>
              {resultado ? (
                <ResultadoDecisionCard ref={resultadoRef} resultado={resultado} />
              ) : null}
              {detalle.estado !== "enviada" ? (
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
              ) : null}
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
