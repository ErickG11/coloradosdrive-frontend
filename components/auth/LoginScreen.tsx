"use client";

import Image from "next/image";
import { motion, useReducedMotion, useSpring } from "framer-motion";
import type { PointerEvent, ReactNode } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import background from "@/public/images/login-fondo.png";
import { LoginIcon } from "./LoginIcon";
import styles from "./login.module.css";

const pillars = [
  { title: "Seguridad", description: "Tus datos siempre protegidos.", icon: "shield" },
  { title: "Confianza", description: "Una escuela comprometida contigo.", icon: "people" },
  { title: "Tu futuro", description: "Más que conducir, es llegar más lejos.", icon: "road" },
] as const;

export function LoginScreen({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const x = useSpring(0, { stiffness: 220, damping: 30 });
  const y = useSpring(0, { stiffness: 220, damping: 30 });

  function moveBackground(event: PointerEvent<HTMLElement>) {
    if (
      reducedMotion ||
      event.pointerType !== "mouse" ||
      !window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches
    )
      return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 6);
    y.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 4);
  }

  return (
    <main
      className={styles.screen}
      aria-label="Iniciar sesión en Colorados Drive"
      onPointerMove={moveBackground}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <div className={styles.ambience} aria-hidden="true">
        <Image src={background} alt="" fill sizes="100vw" />
      </div>
      <div className={styles.themeControl}>
        <ThemeToggle className={styles.themeToggle} />
      </div>
      <div className={styles.stage}>
        <div className={styles.backdrop}>
          <motion.div
            className={styles.backgroundMotion}
            style={{ x: reducedMotion ? 0 : x, y: reducedMotion ? 0 : y }}
          >
            <Image
              src={background}
              alt="Colorados Drive. Formamos conductores para un mejor mañana."
              priority
              sizes="(min-width: 1024px) 100vw, (min-width: 640px) 135vw, 223vw"
              className={styles.backgroundImage}
            />
          </motion.div>
        </div>
        <section className={styles.card} aria-labelledby="login-title">
          <header className={styles.cardHeader}>
            <span className={styles.redMark} aria-hidden="true" />
            <h1 id="login-title">Bienvenido</h1>
            <p>Ingresa a tu cuenta para continuar.</p>
          </header>
          {children}
        </section>
        <section className={styles.pillars} aria-label="Nuestro compromiso contigo">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={false}
              whileInView={reducedMotion ? undefined : { opacity: [0.7, 1], y: [8, 0] }}
              viewport={{ once: true }}
              transition={{
                duration: 0.24,
                delay: reducedMotion ? 0 : index * 0.04,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              <LoginIcon name={pillar.icon} />
              <div>
                <h2>{pillar.title}</h2>
                <p>{pillar.description}</p>
              </div>
            </motion.div>
          ))}
        </section>
      </div>
    </main>
  );
}
