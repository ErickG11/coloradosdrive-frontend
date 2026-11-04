import { ContactoWhatsApp } from "./ContactoWhatsApp";
import styles from "./wizard.module.css";

export function InscripcionesCerradas() {
  return (
    <div className={styles.form}>
      <p className={`${styles.notice} ${styles.noticeWarning}`}>
        Las inscripciones en línea están cerradas por ahora.
      </p>
      <p>
        Atendemos tu inscripción por WhatsApp. Escríbenos y te indicamos cómo inscribirte en el
        curso que necesitas.
      </p>
      <ContactoWhatsApp />
    </div>
  );
}
