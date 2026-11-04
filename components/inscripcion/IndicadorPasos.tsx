import { PASO_ESTADO, type PasoId } from "./pasos/tipos";
import styles from "./wizard.module.css";

// Los 7 pasos del postulante; el paso 7 (estado) cierra el indicador completo.
export const ETIQUETAS_PASOS = [
  "Requisitos",
  "Correo",
  "Código",
  "Consentimiento",
  "Datos",
  "Estudios",
  "Revisar y enviar",
] as const;

export function IndicadorPasos({ paso }: { paso: PasoId }) {
  const total = ETIQUETAS_PASOS.length;
  const terminado = paso === PASO_ESTADO;
  const actual = terminado ? total : paso + 1;
  const porcentaje = terminado ? 100 : Math.round((paso / total) * 100);

  return (
    <nav className={styles.indicator} aria-label="Progreso de la inscripción">
      <p className={styles.indicatorSummary}>
        {terminado ? "Estado de tu solicitud" : `Paso ${actual} de ${total}`}
        <span>{terminado ? "Seguimiento" : ETIQUETAS_PASOS[Math.min(paso, total - 1)]}</span>
      </p>
      <div className={styles.bar} aria-hidden="true">
        <span style={{ width: `${porcentaje}%` }} />
      </div>
      <ol className={styles.stepList}>
        {ETIQUETAS_PASOS.map((etiqueta, indice) => (
          <li
            key={etiqueta}
            aria-current={!terminado && indice === paso ? "step" : undefined}
            data-done={terminado || indice < paso}
          >
            <span className={styles.stepNumber} aria-hidden="true">
              {terminado || indice < paso ? "✓" : indice + 1}
            </span>
            {etiqueta}
            {terminado || indice < paso ? <span className="sr-only"> (completado)</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
