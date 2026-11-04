import { useId } from "react";
import type { MedidorDiario, ResumenSolicitudes } from "@/types/inscripcion";
import styles from "./solicitudes.module.css";

function Medidor({ titulo, medidor }: { titulo: string; medidor: MedidorDiario | undefined }) {
  const id = useId();
  if (!medidor) return null;
  const { usado, tope } = medidor;
  const porcentaje = tope > 0 ? Math.min(100, Math.round((usado / tope) * 100)) : 0;
  const alerta = medidor.alerta ?? (tope > 0 && usado / tope >= 0.8);
  return (
    <div className={styles.meter} data-alert={alerta}>
      <div className={styles.meterHead}>
        <span id={id}>{titulo}</span>
        <span className="tabular-nums">
          {usado} de {tope}
        </span>
      </div>
      <div
        role="meter"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={tope}
        aria-valuenow={Math.min(usado, tope)}
        aria-valuetext={`${usado} de ${tope} usados hoy${alerta ? ", cerca del tope" : ""}`}
        className={styles.meterTrack}
      >
        <span className={styles.meterFill} style={{ width: `${porcentaje}%` }} />
      </div>
      {alerta ? <span className={styles.meterAlert}>Cerca del tope diario</span> : null}
    </div>
  );
}

// Medidores de códigos y subidas del día. Si el servidor informa las solicitudes nuevas también
// se muestran, porque son el tercer tope con alerta al 80 %.
export function MedidoresDiarios({ resumen }: { resumen: ResumenSolicitudes | null }) {
  if (!resumen) return null;
  return (
    <section className={styles.meters} aria-label="Uso diario de inscripciones en línea">
      <Medidor titulo="Códigos enviados hoy" medidor={resumen.cupoCodigosHoy} />
      <Medidor titulo="Subidas de archivos hoy" medidor={resumen.cupoSubidasHoy} />
      <Medidor titulo="Solicitudes nuevas hoy" medidor={resumen.cupoSolicitudesHoy} />
    </section>
  );
}
