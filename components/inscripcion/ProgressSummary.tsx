import type { InscripcionStep } from "./flowProgress";
import styles from "./inscripcion.module.css";

export const ENROLLMENT_STEPS = [
  {
    key: "correo",
    label: "Curso y correo",
    help: "Elige tu curso y el correo donde recibirás la respuesta.",
  },
  {
    key: "codigo",
    label: "Verifica tu correo",
    help: "Confirma tu correo para continuar de forma segura.",
  },
  {
    key: "consentimiento",
    label: "Consentimiento",
    help: "Revisa el aviso y registra tu autorización.",
  },
  {
    key: "datos",
    label: "Datos personales",
    help: "Completa los datos del postulante y, si corresponde, de su representante.",
  },
  {
    key: "documentos",
    label: "Documentos",
    help: "Adjunta los documentos disponibles. Puedes continuar aunque te falte alguno.",
  },
  {
    key: "revision",
    label: "Revisar y enviar",
    help: "Comprueba los documentos obligatorios antes de enviar a la escuela.",
  },
] as const;

export function ProgressSummary({
  step,
  course,
  correo,
  verified,
}: {
  step: InscripcionStep;
  course?: string;
  correo: string;
  verified: boolean;
}) {
  const index = Math.max(
    0,
    ENROLLMENT_STEPS.findIndex((item) => item.key === step),
  );
  return (
    <aside className={styles.summary} aria-label="Tu solicitud">
      <div className={styles.summaryHeading}>
        <span className={styles.eyebrow}>Inscripción en línea</span>
        <h2>Tu solicitud</h2>
      </div>
      <dl className={styles.summaryData}>
        <div>
          <dt>Curso elegido</dt>
          <dd>{course || "Selecciona tu curso"}</dd>
        </div>
        <div>
          <dt>{verified ? "Correo verificado" : "Correo electrónico"}</dt>
          <dd>{correo || "Aún no indicado"}</dd>
        </div>
      </dl>
      <nav aria-label="Progreso de inscripción">
        <p className={styles.progressSummary} aria-live="polite">
          Paso {index + 1} de 6<span>{ENROLLMENT_STEPS[index].label}</span>
        </p>
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-label="Progreso de inscripción"
          aria-valuemin={1}
          aria-valuemax={6}
          aria-valuenow={index + 1}
        >
          <span style={{ width: `${((index + 1) / 6) * 100}%` }} />
        </div>
        <ol className={styles.steps}>
          {ENROLLMENT_STEPS.map((item, i) => (
            <li
              key={item.key}
              aria-current={item.key === step ? "step" : undefined}
              data-done={i < index}
            >
              <span className={styles.stepNumber} aria-hidden="true">
                {i < index ? "✓" : i + 1}
              </span>
              <span>
                {item.label}
                {i < index ? <span className="sr-only"> — Completado</span> : null}
              </span>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}
