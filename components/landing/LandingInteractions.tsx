"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { landingContent } from "@/lib/content/landing";
import type { LandingImage } from "@/lib/content/landing";
import { LandingIcon } from "./LandingIcon";
import styles from "./landing.module.css";

export function LearningJourney() {
  const section = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start 0.9", "end 0.6"] });
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 30 });
  return (
    <section
      ref={section}
      className={`${styles.container} ${styles.section}`}
      aria-labelledby="journey-title"
    >
      <div className={styles.sectionHeading}>
        <h2 id="journey-title">
          Del primer paso
          <br />a tu certificado.
        </h2>
        <p>Un recorrido conectado para que te concentres en lo importante: aprender a conducir.</p>
      </div>
      <div className={styles.journey}>
        <div className={styles.journeyTrack} aria-hidden="true">
          <motion.span style={{ scaleX: reducedMotion ? 1 : progress }} />
        </div>
        <div className={styles.journeyTrackMobile} aria-hidden="true">
          <motion.span style={{ scaleY: reducedMotion ? 1 : progress }} />
        </div>
        <ol className={styles.journeySteps}>
          {landingContent.steps.map((step, index) => (
            <li key={step.title}>
              <span className={styles.stepNumber} aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function ParallaxMedia({ image }: { image: LandingImage }) {
  const element = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: element, offset: ["start end", "end start"] });
  const offset = useTransform(scrollYProgress, [0, 1], [8, -8]);
  return (
    <motion.div
      ref={element}
      style={{ y: reducedMotion ? 0 : offset }}
      className={styles.parallaxMedia}
    >
      <Image
        {...image}
        alt={image.alt}
        className={styles.fullImage}
        sizes="(min-width: 1440px) 700px, (min-width: 900px) 55vw, 90vw"
      />
    </motion.div>
  );
}

export function RoleViews() {
  const [selected, setSelected] = useState(0);
  const [animate, setAnimate] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const reducedMotion = useReducedMotion();
  const role = landingContent.roles[selected];

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % landingContent.roles.length;
    else if (event.key === "ArrowLeft")
      next = (index + landingContent.roles.length - 1) % landingContent.roles.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = landingContent.roles.length - 1;
    else return;
    event.preventDefault();
    setAnimate(false);
    setSelected(next);
    buttons.current[next]?.focus();
  }

  return (
    <section className={styles.rolesSection} aria-labelledby="roles-title">
      <div className={styles.container}>
        <h2 id="roles-title">
          Una plataforma,
          <br />
          tres vistas.
        </h2>
        <div className={styles.tabList} role="tablist" aria-label="Vistas de la plataforma">
          {landingContent.roles.map((item, index) => (
            <button
              key={item.id}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              id={`tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={selected === index}
              aria-controls={`panel-${item.id}`}
              tabIndex={selected === index ? 0 : -1}
              onKeyDown={(event) => handleKey(event, index)}
              onClick={() => {
                setAnimate(true);
                setSelected(index);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        {landingContent.roles.map((item, index) => (
          <div
            key={item.id}
            id={`panel-${item.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${item.id}`}
            tabIndex={0}
            hidden={selected !== index}
          >
            {selected === index && (
              <motion.div
                key={role.id}
                className={styles.rolePanel}
                initial={animate && !reducedMotion ? { opacity: 0.65, y: 6 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <div>
                  <h3>{role.title}</h3>
                  <p>{role.description}</p>
                  <ul className={styles.checkList}>
                    {role.features.map((feature) => (
                      <li key={feature}>
                        <LandingIcon name="check" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={styles.roleJourney}>
                  <p>{role.summary}</p>
                  <ol>
                    {role.journey.map((step, stepIndex) => (
                      <li key={step}>
                        <LandingIcon
                          name={(["book", "calendar", "certificate"] as const)[stepIndex]}
                        />
                        <span>{step}</span>
                        {stepIndex < role.journey.length - 1 && (
                          <LandingIcon name="arrow" className={styles.roleArrow} />
                        )}
                      </li>
                    ))}
                  </ol>
                  <span className={styles.roleSignature}>{landingContent.platformName}</span>
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
