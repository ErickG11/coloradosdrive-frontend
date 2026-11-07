import { landingContent } from "@/lib/content/landing";

import styles from "./wizard.module.css";

// Enlaces de contacto por WhatsApp ya existentes en la landing.
export function ContactoWhatsApp() {
  return (
    <div className={styles.contact}>
      {landingContent.whatsapp.map((phone) => (
        <a key={phone.international} href={phone.href} target="_blank" rel="noopener noreferrer">
          WhatsApp {phone.display}
          <span className="sr-only"> (abre otra pestaña)</span>
        </a>
      ))}
    </div>
  );
}
