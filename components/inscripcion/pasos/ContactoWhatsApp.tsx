import { landingContent, whatsappHref } from "@/lib/content/landing";
import styles from "./pasos.module.css";

export interface ContactoWhatsAppProps {
  mensaje: string;
}

// Enlaces de contacto ya existentes en la landing (dos números de WhatsApp).
export function ContactoWhatsApp({ mensaje }: ContactoWhatsAppProps) {
  return (
    <div className={styles.enlaces}>
      {landingContent.whatsapp.map((telefono) => (
        <a
          key={telefono.international}
          href={whatsappHref(mensaje, telefono.international)}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp {telefono.display}
        </a>
      ))}
    </div>
  );
}
