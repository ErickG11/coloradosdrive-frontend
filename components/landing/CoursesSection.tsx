import Image from "next/image";

import { landingContent } from "@/lib/content/landing";
import type { PublicCourse } from "@/types/publicCourse";
import { LandingIcon } from "./LandingIcon";
import { ScrollReveal } from "./ScrollReveal";
import styles from "./landing.module.css";

export function CoursesSection({ courses }: { courses: PublicCourse[] }) {
  return (
    <section
      id="cursos"
      aria-labelledby="courses-title"
      className={`${styles.container} ${styles.section}`}
    >
      <div className={styles.sectionHeading}>
        <h2 id="courses-title">
          Tu camino.
          <br />
          Tu próxima licencia.
        </h2>
        <p>Carro o moto. Elige cómo quieres moverte y empieza a prepararte con nosotros.</p>
      </div>
      <div className={styles.courseGrid}>
        {landingContent.courses.map((course, index) => {
          const publicCourse = courses.find((item) => item.tipo === course.type);
          return (
            <ScrollReveal key={course.type} delay={index * 0.05}>
              <article className={styles.course} aria-labelledby={`course-${course.type}`}>
                <Image
                  {...course.image}
                  alt={course.image.alt}
                  sizes="(min-width: 1440px) 620px, (min-width: 768px) 46vw, 90vw"
                  className={styles.fullImage}
                />
                <div className={styles.courseBody}>
                  <div className={styles.courseHeading}>
                    <div>
                      <h3 id={`course-${course.type}`}>{course.name}</h3>
                      <p>{course.description}</p>
                    </div>
                    <p className={styles.price}>
                      ${course.price}
                      <span>+ IVA</span>
                    </p>
                  </div>
                  <ul className={styles.checkList}>
                    {course.benefits.map((benefit) => (
                      <li key={benefit}>
                        <LandingIcon name="check" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  {publicCourse?.horasRequeridas != null && (
                    <p className={styles.courseHours}>
                      {publicCourse.horasRequeridas} horas requeridas
                    </p>
                  )}
                  <a
                    href={course.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.button}
                    aria-label={`Inscribirme en ${course.name}`}
                  >
                    Inscribirme
                    <LandingIcon name="arrow" />
                  </a>
                </div>
              </article>
            </ScrollReveal>
          );
        })}
      </div>
      <p className={styles.note}>Valores sin IVA. Consulta fechas y cohortes por WhatsApp.</p>
    </section>
  );
}
