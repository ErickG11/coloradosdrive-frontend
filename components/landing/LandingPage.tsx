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
import { RequirementsSection } from "./RequirementsSection";
import { ScheduleSection } from "./ScheduleSection";
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
          {/* Información fija de la landing anterior que la nueva no cubría. */}
          <RequirementsSection />
          <ScheduleSection />
          <LearningJourney />
          <section
            id="plataforma"
            aria-labelledby="platform-title"
            className={styles.platformSection}
          >
            <div className={`${styles.container} ${styles.platformGrid}`}>
              <div className={styles.platformCopy}>
                <ScrollReveal>
                  <h2 id="platform-title">
                    Tu formación.
                    <br />
                    <span>Siempre contigo.</span>
                  </h2>
                </ScrollReveal>
                <p className={styles.lead}>
                  Aprende también con nuestra plataforma. Prepárate a tu ritmo y encuentra tu
                  próximo paso en un solo lugar.
                </p>
                <ul className={styles.platformFeatures}>
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
              <ScrollReveal className={styles.platformMedia}>
                <Image
                  unoptimized
                  {...landingImages.platform}
                  alt={landingImages.platform.alt}
                  sizes="(min-width: 900px) 1000px, 170vw"
                />
                <div className={styles.platformCaption}>
                  <LandingIcon name="book" />
                  <span>
                    Tu aprendizaje continúa.<strong>Dentro y fuera del aula.</strong>
                  </span>
                </div>
              </ScrollReveal>
            </div>
          </section>
          <section
            id="practicas"
            aria-labelledby="practice-title"
            className={`${styles.container} ${styles.practiceSection}`}
          >
            <div className={styles.practiceRow}>
              <ParallaxMedia image={landingImages.practice} />
              <div className={styles.practiceCopy}>
                <ScrollReveal>
                  <h2 id="practice-title">
                    Al volante.
                    <br />
                    <span>Con confianza.</span>
                  </h2>
                </ScrollReveal>
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
              <div className={styles.practiceCopy}>
                <ScrollReveal>
                  <h2>
                    Entiende lo
                    <br />
                    <span>que conduces.</span>
                  </h2>
                </ScrollReveal>
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
            className={`${styles.container} ${styles.contactSection}`}
          >
            <div className={styles.contactCopy}>
              <ScrollReveal>
                <h2 id="contact-title">
                  Tu camino
                  <br />
                  <span>empieza aquí.</span>
                </h2>
              </ScrollReveal>
              <p className={styles.lead}>
                Tu curso de auto y moto en un solo lugar. Escríbenos y encuentra tu próxima cohorte.
              </p>
              <div className={styles.contactPhones}>
                {landingContent.whatsapp.map((phone, index) => (
                  <a
                    key={phone.international}
                    href={phone.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LandingIcon name="whatsapp" />
                    <span>
                      <span>WhatsApp {index + 1}</span>
                      <strong>{phone.display}</strong>
                    </span>
                    <LandingIcon name="arrow" />
                  </a>
                ))}
              </div>
              <div className={styles.address}>
                <LandingIcon name="pin" />
                <div>
                  <address>{landingContent.address}</address>
                  <a
                    href={landingContent.mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.textLink}
                  >
                    Abrir en Google Maps
                    <LandingIcon name="arrow" />
                  </a>
                </div>
              </div>
              {landingContent.hours && (
                <p className={styles.note}>Horario: {landingContent.hours}</p>
              )}
            </div>
            <ScrollReveal className={styles.contactMedia}>
              <Image
                unoptimized
                {...landingImages.contact}
                alt="Referencia visual de la ubicación de Colorados Drive y sus vehículos de formación."
                sizes="(min-width: 900px) 800px, 100vw"
              />
            </ScrollReveal>
          </section>
          <section className={styles.closing} aria-labelledby="closing-title">
            <Image
              unoptimized
              {...landingImages.closing}
              alt="Vehículo de Colorados Drive frente a la escuela."
              sizes="100vw"
              className={styles.closingImage}
            />
            <div className={`${styles.container} ${styles.closingInner}`}>
              <ScrollReveal>
                <h2 id="closing-title">
                  Nos vemos
                  <br />
                  en el camino.
                </h2>
              </ScrollReveal>
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
                <Link href="/login" className={styles.heroLogin}>
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
