"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { landingContent, landingImages } from "@/lib/content/landing";
import type { LandingImage } from "@/lib/content/landing";
import { LandingIcon } from "./LandingIcon";
import styles from "./landing.module.css";

export function LearningJourney() {
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start 0.6", "end 0.8"] });
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 30 });
  const images = [landingContent.courses[0].image, landingImages.classes, landingImages.practice];
  return (
    <section ref={section} className={styles.journeySection} aria-labelledby="journey-title">
      <div className={`${styles.container} ${styles.journey}`}>
        <div className={styles.journeySticky}>
          <h2 id="journey-title">
            De tu primer paso
            <br />
            <span>a tu certificado.</span>
          </h2>
          <p>
            Un recorrido conectado para que te concentres en lo importante: aprender a conducir.
          </p>
          <div className={styles.journeyMedia}>
            {images.map((image, index) => (
              <Image
                unoptimized
                key={image.src}
                {...image}
                alt={image.alt}
                sizes="(min-width: 900px) 800px, 160vw"
                data-active={active === index}
                aria-hidden={active !== index}
              />
            ))}
            <div
              className={styles.journeyCertificate}
              data-ui
              data-active={active === 3}
              aria-hidden={active !== 3}
            >
              <div>
                <Image unoptimized {...landingImages.logo} alt="" sizes="160px" />
                <span>Vista ilustrativa</span>
              </div>
              <h3>
                Certificado
                <br />
                digital.
              </h3>
              <p>
                <LandingIcon name="certificate" />
                Tu formación, con verificación QR.
              </p>
            </div>
            <div className={styles.journeyCaption} data-ui aria-hidden="true">
              <span>
                {active + 1} <span>/ 4</span>
              </span>
              <strong>{landingContent.steps[active].title}</strong>
            </div>
          </div>
        </div>
        <div className={styles.journeyRoad}>
          <div className={styles.journeyRail} aria-hidden="true">
            <motion.span style={{ scaleY: reducedMotion ? 1 : progress }} />
          </div>
          <ol className={styles.journeySteps}>
            {landingContent.steps.map((step, index) => (
              <motion.li
                key={step.title}
                data-active={active === index}
                onViewportEnter={() => setActive(index)}
                viewport={{ margin: "-35% 0px -35% 0px" }}
              >
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <h3>
                    <button
                      type="button"
                      onClick={() => setActive(index)}
                      aria-label={`Ver etapa ${index + 1}: ${step.title}`}
                      aria-pressed={active === index}
                    >
                      {step.title}
                      <LandingIcon name="arrow" />
                    </button>
                  </h3>
                  <p>{step.description}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function ParallaxMedia({ image }: { image: LandingImage }) {
  const element = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: element, offset: ["start end", "end start"] });
  const offset = useTransform(scrollYProgress, [0, 1], [24, -24]);
  return (
    <motion.div
      ref={element}
      style={{ y: reducedMotion ? 0 : offset }}
      className={styles.parallaxMedia}
    >
      <Image
        unoptimized
        {...image}
        alt={image.alt}
        className={styles.practicePhoto}
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
        <div className={styles.sectionHeading}>
          <h2 id="roles-title">
            Cada persona.
            <br />
            <span>Su propio espacio.</span>
          </h2>
          <p>Una escuela conectada, con una vista para cada parte del camino.</p>
        </div>
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
