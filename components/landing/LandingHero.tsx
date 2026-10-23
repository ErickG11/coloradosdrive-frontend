"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import { landingContent, landingImages } from "@/lib/content/landing";
import { LandingIcon } from "./LandingIcon";
import styles from "./landing.module.css";

export function LandingHero() {
  const section = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end start"] });
  const imageOffset = useTransform(scrollYProgress, [0, 1], [0, 20]);

  return (
    <section
      ref={section}
      className={`${styles.container} ${styles.hero}`}
      aria-labelledby="landing-title"
    >
      <div className={styles.heroCopy}>
        <h1 id="landing-title" className={styles.heroTitle}>
          Conduce tu futuro <span>con Colorados Drive</span>
        </h1>
        <p className={styles.heroDescription}>{landingContent.description}</p>
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
        <a href="#cursos" className={styles.heroExplore}>
          Encuentra tu próximo camino
          <LandingIcon name="arrow" />
        </a>
      </div>
      <motion.div className={styles.heroVisual} style={{ y: reducedMotion ? 0 : imageOffset }}>
        <div className={styles.heroImageWindow}>
          <Image
            {...landingImages.hero}
            alt={landingImages.hero.alt}
            priority
            sizes="(min-width: 1440px) 1250px, (min-width: 900px) 100vw, 170vw"
            className={styles.heroSource}
          />
        </div>
      </motion.div>
    </section>
  );
}
