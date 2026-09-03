"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import type { Role } from "@/types/user";
import { cn } from "@/lib/utils/cn";

import { LogoutButton } from "./LogoutButton";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  estudiante: "Estudiante",
  instructor: "Instructor",
};

interface SidebarProps {
  email: string | null;
  role: Role | null;
}

// Sidebar lateral (reemplaza el Navbar superior). Sigue el tema
// claro/oscuro como el resto de la app — es vidrio (bg-surface-raised +
// backdrop-blur), no un panel fijo siempre oscuro, para no romper la
// paridad de temas que se acaba de construir. En <768px colapsa a un
// drawer con overlay; en >=768px queda fijo (sticky) a la izquierda.
export function Sidebar({ email, role }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isCohortsActive = pathname.startsWith("/admin/cohorts");
  const isEnrollmentsActive = pathname.startsWith("/admin/enrollments");

  function closeDrawer() {
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDrawer();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const navLinks = (
    <>
      <div className="flex flex-col gap-1 px-3 pt-2">
        <SidebarLink href="/admin/cohorts" active={isCohortsActive} onClick={closeDrawer}>
          <CalendarIcon className="h-5 w-5" />
          Cohortes
        </SidebarLink>
        <SidebarLink href="/admin/enrollments" active={isEnrollmentsActive} onClick={closeDrawer}>
          <UserPlusIcon className="h-5 w-5" />
          Matricular estudiante
        </SidebarLink>
      </div>
      <div className="mt-auto flex flex-col gap-2 border-t border-border px-3 pt-4 pb-4">
        <div className="flex flex-col text-sm">
          {email ? <span className="truncate text-text-primary">{email}</span> : null}
          <span className="text-text-secondary">{role ? ROLE_LABELS[role] : "Invitado"}</span>
        </div>
        <LogoutButton />
      </div>
    </>
  );

  return (
    <>
      {/* Topbar móvil: reemplaza el sidebar cuando colapsa (<768px) */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg-surface-raised px-4 backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir menú"
          className="rounded-sm p-1.5 text-text-primary hover:bg-bg-sunken"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
        <span className="font-display text-base font-semibold text-text-primary">
          ColoradosDrive
        </span>
        <span className="w-9" aria-hidden="true" />
      </header>

      {/* Sidebar fijo de escritorio (>=768px) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-bg-surface-raised backdrop-blur-md md:flex">
        <div className="px-5 py-6">
          <span className="font-display text-lg font-semibold text-text-primary">
            ColoradosDrive
          </span>
        </div>
        <nav className="flex flex-1 flex-col overflow-y-auto">{navLinks}</nav>
      </aside>

      {/* Drawer móvil */}
      <AnimatePresence>
        {isOpen ? (
          <>
            <motion.div
              key="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={closeDrawer}
              aria-hidden="true"
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
            />
            <motion.aside
              key="sidebar-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-bg-surface-raised backdrop-blur-md md:hidden"
            >
              <div className="flex items-center justify-between px-5 py-6">
                <span className="font-display text-lg font-semibold text-text-primary">
                  ColoradosDrive
                </span>
                <button
                  type="button"
                  onClick={closeDrawer}
                  aria-label="Cerrar menú"
                  className="rounded-sm p-1.5 text-text-primary hover:bg-bg-sunken"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col overflow-y-auto">{navLinks}</nav>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

interface SidebarLinkProps {
  href: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

function SidebarLink({ href, active, onClick, children }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent-red-subtle text-accent-red"
          : "text-text-secondary hover:bg-bg-sunken hover:text-text-primary",
      )}
    >
      {children}
    </Link>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3 5h14M3 10h14M3 15h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M5 5l10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 8.5h14M7 3v3M13 3v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2.5 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M15.5 6v5M13 8.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
