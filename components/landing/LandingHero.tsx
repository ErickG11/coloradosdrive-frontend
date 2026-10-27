"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";

import { landingContent } from "@/lib/content/landing";
import { LandingIcon } from "./LandingIcon";
import styles from "./landing.module.css";

export function LandingHero() {
  const section = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState("B");
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 64]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  return (
    <section ref={section} className={styles.hero} aria-labelledby="landing-title">
      <div className={`${styles.container} ${styles.heroContent}`}>
        <div className={styles.heroCopy}>
          <h1 id="landing-title" className={styles.heroTitle}>
            <span>Tu futuro.</span>
            <span>En marcha.</span>
          </h1>
          <p className={styles.heroDescription}>{landingContent.description}</p>
          <div className={styles.actions}>
            <a
              href={landingContent.enrollmentHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.button}
            >
              ¡Inscríbete hoy! <LandingIcon name="arrow" />
            </a>
            <Link href="/login" className={styles.heroLogin}>
              Iniciar sesión <LandingIcon name="arrow" />
            </Link>
          </div>
          <p className={styles.heroLocation}>
            <LandingIcon name="pin" /> Escuela de conducción en Santo Domingo
          </p>
        </div>
      </div>
      <motion.div
        className={styles.heroVisual}
        style={{ y: reducedMotion ? 0 : imageY, scale: reducedMotion ? 1 : imageScale }}
      >
        {landingContent.courses.map((course) => (
          <Image
            unoptimized
            key={course.type}
            {...course.image}
            alt={
              course.type === "B"
                ? "Vehículo de Colorados Drive frente a la escuela."
                : "Motociclista equipado frente a Colorados Drive."
            }
            priority={course.type === "B"}
            loading={course.type === "B" ? undefined : "eager"}
            sizes="(min-width: 900px) 100vw, 180vw"
            className={styles.heroPhoto}
            data-active={selected === course.type}
            aria-hidden={selected !== course.type}
          />
        ))}
      </motion.div>
      <div className={styles.heroShade} aria-hidden="true" />
      <div className={`${styles.container} ${styles.heroBottom}`}>
        <div className={styles.heroChoice} role="group" aria-label="¿Qué quieres conducir?">
          <span>Tu próximo camino</span>
          {landingContent.courses.map((course) => (
            <button
              key={course.type}
              type="button"
              aria-pressed={selected === course.type}
              onClick={() => setSelected(course.type)}
            >
              <span>{course.type === "B" ? "Carro" : "Moto"}</span>
              <span>Tipo {course.type}</span>
              <LandingIcon name="arrow" />
            </button>
          ))}
        </div>
        <a href={`#course-${selected}`} className={styles.heroExplore}>
          Explorar Tipo {selected}
          <LandingIcon name="arrow" />
        </a>
      </div>
    </section>
  );
}
