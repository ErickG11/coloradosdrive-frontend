"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { landingContent, landingImages } from "@/lib/content/landing";
import { LandingIcon } from "./LandingIcon";
import styles from "./landing.module.css";

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (value) => setScrolled(value > 16));

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButton.current?.focus();
    }
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false);
    }
    const desktop = window.matchMedia("(min-width: 1100px)");
    function closeOnDesktop() {
      if (desktop.matches) setOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);

  return (
    <header ref={header} className={styles.header} data-scrolled={scrolled}>
      <div className={`${styles.container} ${styles.headerInner}`}>
        <Link href="/" className={styles.brand} aria-label="Colorados Drive, inicio">
          <Image
            unoptimized
            {...landingImages.logo}
            alt={landingImages.logo.alt}
            loading="eager"
            sizes="(min-width: 768px) 152px, 128px"
          />
        </Link>
        <nav aria-label="Navegación principal" className={styles.desktopNav}>
          {landingContent.navigation.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <ThemeToggle className={styles.iconButton} />
          <Link href="/login" className={styles.headerLogin}>
            Iniciar sesión
          </Link>
          <a
            href={landingContent.enrollmentHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.button} ${styles.headerCta}`}
          >
            Inscríbete
            <LandingIcon name="arrow" />
          </a>
          <button
            ref={menuButton}
            type="button"
            className={`${styles.iconButton} ${styles.menuToggle}`}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="landing-mobile-nav"
            onClick={() => setOpen(!open)}
          >
            <LandingIcon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>
      <nav
        id="landing-mobile-nav"
        aria-label="Navegación móvil"
        hidden={!open}
        className={styles.mobileNav}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
      >
        <div className={styles.container}>
          {landingContent.navigation.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
              <LandingIcon name="arrow" />
            </a>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            Iniciar sesión
            <LandingIcon name="arrow" />
          </Link>
          <a
            href={landingContent.enrollmentHref}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.button}
            onClick={() => setOpen(false)}
          >
            Inscríbete por WhatsApp
            <LandingIcon name="whatsapp" />
          </a>
        </div>
      </nav>
    </header>
  );
}
