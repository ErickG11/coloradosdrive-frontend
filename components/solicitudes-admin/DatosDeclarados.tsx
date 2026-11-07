import type { SolicitudAdminDetalle } from "@/types/inscripcion";
import {
  ETIQUETA_NACIONALIDAD,
  ETIQUETA_NIVEL,
  ETIQUETA_SANGRE,
  formatearFecha,
  nombreDe,
} from "./catalogo";
import styles from "./solicitudes.module.css";

// «Lo que declaró»: datos tal como los escribió el postulante. React escapa todo el texto.
export function DatosDeclarados({ detalle }: { detalle: SolicitudAdminDetalle }) {
  const filas: [string, string][] = [
    ["Nombres y apellidos", nombreDe(detalle)],
    ["Cédula", detalle.cedula ?? "No registrada"],
    ["Fecha de nacimiento", detalle.fechaNacimiento ?? "No indicada"],
    [
      "Nacionalidad",
      detalle.nacionalidadTipo ? ETIQUETA_NACIONALIDAD[detalle.nacionalidadTipo] : "No indicada",
    ],
    ["Correo", detalle.correo],
    ["Teléfono", detalle.telefono ?? "No indicado"],
    ["Tipo de sangre", detalle.tipoSangre ? ETIQUETA_SANGRE[detalle.tipoSangre] : "No indicado"],
    [
      "Nivel de estudios",
      detalle.nivelEstudios ? ETIQUETA_NIVEL[detalle.nivelEstudios] : "No indicado",
    ],
    [
      "Curso",
      detalle.curso
        ? `Tipo ${detalle.curso.tipo} — ${detalle.curso.nombre} (edad mínima ${detalle.curso.edadMinima})`
        : "Curso no disponible",
    ],
    ["Enviada", formatearFecha(detalle.enviadaAt)],
  ];
  return (
    <section className={styles.section} aria-labelledby="declarado-title">
      <h3 id="declarado-title">Lo que declaró</h3>
      <dl className={styles.dataGrid}>
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta}>
            <dt>{etiqueta}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
      {detalle.devolucionMotivoCodigo && detalle.estado === "devuelta" ? (
        <p className={styles.note}>
          Devuelta el {formatearFecha(detalle.devueltaAt)}
          {detalle.devolucionMensaje ? `: ${detalle.devolucionMensaje}` : "."}
        </p>
      ) : null}
    </section>
  );
}
