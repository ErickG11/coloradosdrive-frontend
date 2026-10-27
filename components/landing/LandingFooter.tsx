import Image from "next/image";
import Link from "next/link";

import { landingContent, landingImages } from "@/lib/content/landing";
import styles from "./landing.module.css";

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div>
            <Link
              href="/"
              className={`${styles.brand} ${styles.footerBrand}`}
              aria-label="Colorados Drive, inicio"
            >
              <Image
                unoptimized
                {...landingImages.logo}
                alt={landingImages.logo.alt}
                sizes="196px"
              />
            </Link>
            <p className={styles.footerSlogan}>{landingContent.slogan}.</p>
          </div>
          <nav aria-label="Enlaces del pie de página">
            <h2>Tu próximo paso</h2>
            {landingContent.navigation.map((link) => (
              <a href={link.href} key={link.href}>
                {link.label}
              </a>
            ))}
            <Link href="/login">Iniciar sesión</Link>
          </nav>
          <div className={styles.footerContact}>
            <h2>Hablemos</h2>
            {landingContent.whatsapp.map((phone) => (
              <a
                key={phone.international}
                href={phone.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp · {phone.display}
              </a>
            ))}
            <a href={landingContent.mapsHref} target="_blank" rel="noopener noreferrer">
              {landingContent.address}
            </a>
            {landingContent.email && (
              <a href={`mailto:${landingContent.email}`}>{landingContent.email}</a>
            )}
            {landingContent.socialLinks?.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>
            © {new Date().getFullYear()} {landingContent.name}
          </span>
          <span>Hecho para tu próximo camino.</span>
        </div>
      </div>
    </footer>
  );
}
