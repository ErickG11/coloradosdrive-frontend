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
        <ScrollReveal>
          <h2 id="courses-title">
            Elige cómo
            <br />
            <span>quieres moverte.</span>
          </h2>
        </ScrollReveal>
        <p>Carro o moto. Tu primera gran decisión empieza con la formación correcta.</p>
      </div>
      <div className={styles.courseGrid}>
        {landingContent.courses.map((course, index) => {
          const publicCourse = courses.find((item) => item.tipo === course.type);
          return (
            <ScrollReveal key={course.type} delay={index * 0.06}>
              <article
                id={`course-${course.type}`}
                className={styles.course}
                aria-labelledby={`course-title-${course.type}`}
              >
                <div className={styles.courseImage}>
                  <Image
                    unoptimized
                    {...course.image}
                    alt={course.image.alt}
                    sizes="(min-width: 1440px) 650px, (min-width: 768px) 50vw, 100vw"
                  />
                </div>
                <div className={styles.courseBody}>
                  <div className={styles.courseHeading}>
                    <div>
                      <h3 id={`course-title-${course.type}`}>{course.name}</h3>
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
                  <div className={styles.courseBottom}>
                    <p className={styles.courseHours}>
                      {publicCourse?.horasRequeridas != null
                        ? `${publicCourse.horasRequeridas} horas requeridas`
                        : "Consulta la próxima cohorte"}
                    </p>
                    <a
                      href={course.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.courseAction}
                      aria-label={`Inscribirme en ${course.name}`}
                    >
                      Inscribirme
                      <LandingIcon name="arrow" />
                    </a>
                  </div>
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
