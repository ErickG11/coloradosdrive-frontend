"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { getSolicitudAdmin } from "@/lib/api/inscripcion";
import type { SolicitudAdminDetalle, SolicitudAdminItem } from "@/types/inscripcion";
import { adminErrorMessage } from "./adminErrors";
import { nombreDe } from "./catalogo";
import { DeleteSolicitud } from "./DeleteSolicitud";
import { SolicitudDrawer } from "./SolicitudDrawer";
import { SolicitudStatus } from "./SolicitudStatus";
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
  const [intento, setIntento] = useState(0);

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
