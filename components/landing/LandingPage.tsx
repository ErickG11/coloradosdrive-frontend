import Image from "next/image";
import Link from "next/link";

import { educationalOrganization, landingContent, landingImages } from "@/lib/content/landing";
import type { PublicCourse } from "@/types/publicCourse";
import { CoursesSection } from "./CoursesSection";
import { LandingFooter } from "./LandingFooter";
import { LandingHeader } from "./LandingHeader";
import { LandingHero } from "./LandingHero";
import { LandingIcon } from "./LandingIcon";
import { LearningJourney, ParallaxMedia, RoleViews } from "./LandingInteractions";
import { MotionRoot } from "./MotionRoot";
import { ScrollReveal } from "./ScrollReveal";
import styles from "./landing.module.css";

export function LandingPage({ courses }: { courses: PublicCourse[] }) {
  return (
    <MotionRoot>
      <div className={styles.page}>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <LandingHeader />
        <main id="contenido" tabIndex={-1}>
          <LandingHero />
          <div className={styles.trustBand}>
            <div className={`${styles.container} ${styles.trustItems}`}>
              {landingContent.trust.map((text, index) => (
                <ScrollReveal key={text} delay={index * 0.04}>
                  <LandingIcon name={(["instructor", "shield", "car"] as const)[index]} />
                  <span>{text}</span>
                </ScrollReveal>
              ))}
            </div>
          </div>
          <CoursesSection courses={courses} />
          <section
            id="plataforma"
            aria-labelledby="platform-title"
            className={styles.platformSection}
          >
            <div className={`${styles.container} ${styles.platformGrid}`}>
              <ScrollReveal>
                <Image
                  {...landingImages.platform}
                  alt={landingImages.platform.alt}
                  className={styles.fullImage}
                  sizes="(min-width: 1440px) 720px, (min-width: 900px) 55vw, 90vw"
                />
              </ScrollReveal>
              <div>
                <h2 id="platform-title">Aprende también con nuestra plataforma.</h2>
                <p className={styles.lead}>Prepárate a tu ritmo.</p>
                <ul className={styles.checkList}>
                  {landingContent.platformFeatures.map((feature) => (
                    <li key={feature}>
                      <LandingIcon name="check" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className={styles.textLink}>
                  Ir a la plataforma
                  <LandingIcon name="arrow" />
                </Link>
              </div>
            </div>
          </section>
          <LearningJourney />
          <section
            id="practicas"
            aria-label="Prácticas y clases"
            className={`${styles.container} ${styles.practiceSection}`}
          >
            <div className={styles.practiceRow}>
              <ParallaxMedia image={landingImages.practice} />
              <div>
                <h2>
                  Aprende
                  <br />
                  <span>con seguridad.</span>
                </h2>
                <p className={styles.lead}>Guía real con instructores calificados.</p>
                <p>
                  Gana confianza al volante con una formación segura y práctica, acompañado en cada
                  paso.
                </p>
                <a
                  href={landingContent.enrollmentHref}
                  className={styles.textLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Consulta por tus prácticas
                  <LandingIcon name="arrow" />
                </a>
              </div>
            </div>
            <div className={`${styles.practiceRow} ${styles.practiceRowReverse}`}>
              <ParallaxMedia image={landingImages.classes} />
              <div>
                <h2>
                  Aprende
                  <br />
                  <span>en la práctica.</span>
                </h2>
                <p>
                  Clases teóricas y prácticas para comprender el funcionamiento del vehículo y
                  llevar tus conocimientos a la vía.
                </p>
                <ul className={styles.checkList}>
                  <li>
                    <LandingIcon name="check" />
                    Conocimientos reales del funcionamiento del vehículo
                  </li>
                  <li>
                    <LandingIcon name="check" />
                    Instructores certificados
                  </li>
                  <li>
                    <LandingIcon name="check" />
                    Clases en vehículos modernos
                  </li>
                </ul>
              </div>
            </div>
          </section>
          <RoleViews />
          <section
            id="contacto"
            aria-labelledby="contact-title"
            className={`${styles.container} ${styles.section}`}
          >
            <div className={styles.sectionHeading}>
              <h2 id="contact-title">
                Estamos aquí
                <br />
                para ti.
              </h2>
              <p>
                Tu curso de auto y moto en un solo lugar. Escríbenos y encuentra tu próxima cohorte.
              </p>
            </div>
            <ScrollReveal>
              <Image
                {...landingImages.contact}
                alt={landingImages.contact.alt}
                className={`${styles.fullImage} ${styles.contactImage}`}
                sizes="(min-width: 1440px) 1256px, 92vw"
              />
            </ScrollReveal>
            <div className={styles.contactGrid}>
              {landingContent.whatsapp.map((phone, index) => (
                <a
                  key={phone.international}
                  href={phone.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactCard}
                >
                  <LandingIcon name="whatsapp" />
                  <span>
                    <span className={styles.contactLabel}>WhatsApp {index + 1}</span>
                    <strong>{phone.display}</strong>
                    <span className={styles.contactHint}>Conversemos sobre tu curso</span>
                  </span>
                  <LandingIcon name="arrow" />
                </a>
              ))}
              <div className={styles.addressCard}>
                <LandingIcon name="pin" />
                <div>
                  <span className={styles.contactLabel}>Visítanos en Santo Domingo</span>
                  <address>{landingContent.address}</address>
                  <a
                    className={styles.textLink}
                    href={landingContent.mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir en Google Maps
                    <LandingIcon name="arrow" />
                  </a>
                </div>
              </div>
            </div>
            {landingContent.hours && <p className={styles.note}>Horario: {landingContent.hours}</p>}
          </section>
          <section
            className={`${styles.container} ${styles.closing}`}
            aria-label="Inscríbete en Colorados Drive"
          >
            <Image
              {...landingImages.closing}
              alt={landingImages.closing.alt}
              className={styles.fullImage}
              sizes="(min-width: 1440px) 1256px, 92vw"
            />
            <div className={styles.closingActions}>
              <p>{landingContent.slogan}.</p>
              <div className={styles.actions}>
                <a
                  href={landingContent.enrollmentHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.button}
                >
                  ¡Inscríbete hoy!
                  <LandingIcon name="arrow" />
                </a>
                <Link href="/login" className={styles.secondaryButton}>
                  Iniciar sesión
                  <LandingIcon name="arrow" />
                </Link>
              </div>
            </div>
          </section>
        </main>
        <LandingFooter />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(educationalOrganization).replace(/</g, "\\u003c"),
          }}
        />
      </div>
    </MotionRoot>
  );
}
