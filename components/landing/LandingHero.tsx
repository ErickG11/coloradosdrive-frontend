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
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 44]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.015, 1.07]);
  return (
    <section ref={section} className={styles.hero} aria-labelledby="landing-title">
      <div className={`${styles.container} ${styles.heroContent}`}>
        <div className={styles.heroCopy}>
          <h1 id="landing-title" className={styles.heroTitle}>
            <span className={styles.heroTitleLine}>Tu futuro.</span>
            <span className={styles.heroTitleLine}>En marcha.</span>
          </h1>
          <p className={styles.heroDescription}>{landingContent.description}</p>
          <div className={styles.actions}>
            <Link href={landingContent.enrollmentHref} className={styles.button}>
              ¡Inscríbete hoy! <LandingIcon name="arrow" />
            </Link>
            <Link href="/login" className={styles.heroLogin}>
              Iniciar sesión <LandingIcon name="arrow" />
            </Link>
          </div>
          <p className={styles.heroLocation}>
            <LandingIcon name="pin" /> Escuela de conducción en Santo Domingo
          </p>
        </div>
      </div>
      <motion.div className={styles.heroVisual} style={{ y: imageY, scale: imageScale }}>
        {landingContent.courses.map((course) => (
          <motion.div
            key={course.type}
            className={styles.heroPhotoFrame}
            initial={false}
            animate={{
              opacity: selected === course.type ? 1 : 0,
              scale: selected === course.type ? 1 : 1.025,
            }}
            transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden="true"
          >
            <Image
              unoptimized
              {...course.image}
              alt=""
              priority={course.type === "B"}
              loading={course.type === "B" ? undefined : "eager"}
              sizes="(min-width: 900px) 100vw, 180vw"
              className={styles.heroPhoto}
            />
          </motion.div>
        ))}
      </motion.div>
      <div className={styles.heroShade} aria-hidden="true" />
      <div className={`${styles.container} ${styles.heroBottom}`}>
        <div className={styles.heroChoice} role="group" aria-label="¿Qué quieres conducir?">
          <span>Tu próximo camino</span>
          {landingContent.courses.map((course) => (
            <motion.button
              key={course.type}
              type="button"
              tabIndex={0}
              aria-pressed={selected === course.type}
              onClick={() => setSelected(course.type)}
              whileTap={reducedMotion ? undefined : { scale: 0.97 }}
            >
              <span>{course.type === "B" ? "Carro" : "Moto"}</span>
              <span>Tipo {course.type}</span>
              <LandingIcon name="arrow" />
              {selected === course.type && (
                <motion.span
                  aria-hidden="true"
                  className={styles.courseIndicator}
                  layoutId="hero-course-indicator"
                  transition={{ duration: reducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
            </motion.button>
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
