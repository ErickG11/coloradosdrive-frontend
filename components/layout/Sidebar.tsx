"use client";

import Link from "next/link";
import Image from "next/image";
import { EnrollmentBrand } from "@/components/inscripcion/EnrollmentVisual";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { XIcon } from "@/components/ui/icons";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { cn } from "@/lib/utils/cn";
import type { Role } from "@/types/user";
import { LogoutButton } from "./LogoutButton";
import { NavigationIcon, type NavigationSection } from "./NavigationIcon";
import { useSolicitudSummary } from "@/components/solicitudes-admin/useSolicitudSummary";
import { PendingSolicitudesBadge } from "@/components/solicitudes-admin/PendingSolicitudesBadge";
import { Toast } from "@/components/inscripcion/Toast";
import styles from "./admin-sidebar.module.css";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  estudiante: "Estudiante",
  instructor: "Instructor",
};
interface SidebarProps {
  email: string | null;
  role: Role | null;
  studentEnrollmentRestricted?: boolean;
}

const COLLAPSED_KEY = "coloradosdrive:sidebar-collapsed:v1";
// Solo el menú de escritorio se contrae; el panel móvil conserva su comportamiento.
const SidebarCollapsed = createContext(false);

export function Sidebar({ email, role, studentEnrollmentRestricted = false }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    // Preferencia por dispositivo; sin almacenamiento se queda expandido.
    const timer = window.setTimeout(() => {
      try {
        if (localStorage.getItem(COLLAPSED_KEY) === "1") setCollapsed(true);
      } catch {
        /* El almacenamiento es opcional. */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    // body[data-sidebar] cambia --sidebar-w, que usan la columna, los paneles y las barras fijas.
    if (collapsed) document.body.dataset.sidebar = "collapsed";
    else delete document.body.dataset.sidebar;
    return () => {
      delete document.body.dataset.sidebar;
    };
  }, [collapsed]);
  function toggleCollapsed() {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, value ? "0" : "1");
      } catch {
        /* La preferencia no se guarda, el cambio sí se aplica. */
      }
      return !value;
    });
  }
  const summary = useSolicitudSummary(role === "admin");
  const [isOpen, setIsOpen] = useState(false);
  const drawer = useRef<HTMLElement>(null);
  const isInstructorScheduleActive =
    pathname === "/instructor" || pathname.startsWith("/instructor/schedule");
  function closeDrawer() {
    setIsOpen(false);
  }
  useDialogFocus(isOpen, drawer, closeDrawer);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(min-width: 768px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  const navLinks = (
    <>
      {role === "admin" ? (
        <>
          <SidebarLink
            href="/admin"
            active={pathname === "/admin"}
            section="panel"
            onClick={closeDrawer}
          >
            Panel
          </SidebarLink>
          <SidebarLink
            href="/admin/students"
            active={pathname.startsWith("/admin/students")}
            section="students"
            onClick={closeDrawer}
          >
            Alumnos
          </SidebarLink>
          <SidebarLink
            href="/admin/cohorts"
            active={pathname.startsWith("/admin/cohorts")}
            section="cohorts"
            onClick={closeDrawer}
          >
            Cohortes
          </SidebarLink>
          <SidebarLink
            href="/admin/instructors"
            active={pathname.startsWith("/admin/instructors")}
            section="instructors"
            onClick={closeDrawer}
          >
            Instructores
          </SidebarLink>
          <SidebarLink
            indicator={<PendingSolicitudesBadge count={summary.pending} />}
            href="/admin/solicitudes"
            active={pathname.startsWith("/admin/solicitudes")}
            section="enroll"
            onClick={closeDrawer}
          >
            Solicitudes de inscripción
          </SidebarLink>
          <SidebarLink
            href="/admin/enrollments"
            active={pathname.startsWith("/admin/enrollments")}
            section="enroll"
            onClick={closeDrawer}
          >
            Matricular estudiante
          </SidebarLink>
          <SidebarLink
            href="/admin/exams"
            active={pathname.startsWith("/admin/exams")}
            section="exams"
            onClick={closeDrawer}
          >
            Exámenes
          </SidebarLink>
          <SidebarLink
            href="/admin/content"
            active={pathname.startsWith("/admin/content")}
            section="content"
            onClick={closeDrawer}
          >
            Contenido
          </SidebarLink>
          <SidebarLink
            href="/admin/practice-slots"
            active={pathname.startsWith("/admin/practice-slots")}
            section="schedule"
            onClick={closeDrawer}
          >
            Horarios de práctica
          </SidebarLink>
          <SidebarLink
            href="/admin/seguridad"
            active={pathname.startsWith("/admin/seguridad")}
            section="security"
            onClick={closeDrawer}
          >
            Seguridad
          </SidebarLink>
        </>
      ) : null}
      {role === "estudiante" ? (
        <>
          {!studentEnrollmentRestricted ? (
            <SidebarLink
              href="/student/dashboard"
              active={pathname === "/student/dashboard"}
              section="panel"
              onClick={closeDrawer}
            >
              Mi panel
            </SidebarLink>
          ) : null}
          <SidebarLink
            href="/student/inscripcion"
            active={pathname.startsWith("/student/inscripcion")}
            section="enroll"
            onClick={closeDrawer}
          >
            Mi inscripción
          </SidebarLink>
          {studentEnrollmentRestricted ? (
            <SidebarLink
              href="/student/change-password"
              active={pathname === "/student/change-password"}
              section="security"
              onClick={closeDrawer}
            >
              Cambiar contraseña
            </SidebarLink>
          ) : (
            <>
              <SidebarLink
                href="/student/course"
                active={
                  pathname.startsWith("/student/course") || pathname.startsWith("/student/exams")
                }
                section="content"
                onClick={closeDrawer}
              >
                Mi curso
              </SidebarLink>
              <SidebarLink
                href="/student/schedule"
                active={pathname.startsWith("/student/schedule")}
                section="schedule"
                onClick={closeDrawer}
              >
                Horarios de práctica
              </SidebarLink>
              <SidebarLink
                href="/student/documents"
                active={pathname.startsWith("/student/documents")}
                section="enroll"
                onClick={closeDrawer}
              >
                Documentos para llevar
              </SidebarLink>
              <SidebarLink
                href="/student/history"
                active={pathname.startsWith("/student/history")}
                section="history"
                onClick={closeDrawer}
              >
                Mi historial de asistencia
              </SidebarLink>
              <SidebarLink
                href="/student/change-password"
                active={pathname.startsWith("/student/change-password")}
                section="security"
                onClick={closeDrawer}
              >
                Cambiar contraseña
              </SidebarLink>
            </>
          )}
        </>
      ) : null}
      {role === "instructor" ? (
        <>
          <SidebarLink
            href="/instructor"
            active={isInstructorScheduleActive}
            section="schedule"
            onClick={closeDrawer}
          >
            Mi agenda
          </SidebarLink>
          <SidebarLink
            href="/instructor/asistencias"
            active={pathname.startsWith("/instructor/asistencias")}
            section="schedule"
            onClick={closeDrawer}
          >
            Asistencias
          </SidebarLink>
          <SidebarLink
            href="/instructor/change-password"
            active={pathname.startsWith("/instructor/change-password")}
            section="security"
            onClick={closeDrawer}
          >
            Cambiar contraseña
          </SidebarLink>
        </>
      ) : null}
    </>
  );
  return (
    <>
      {role === "admin" && summary.notice > 0 ? (
        <div className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)]">
          <Toast
            message="Nueva solicitud de inscripción"
            onDismiss={summary.dismiss}
            action={{ href: "/admin/solicitudes", label: "Ver" }}
          />
        </div>
      ) : null}
      <header className="flex h-16 min-w-0 shrink-0 items-center justify-between border-b border-border bg-bg-surface px-4 md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          className="flex h-11 w-11 items-center justify-center rounded-sm text-text-primary hover:bg-bg-sunken"
        >
          <NavigationIcon section="menu" className="h-5 w-5" />
        </button>
        <span className="mx-2 min-w-0 truncate text-base font-semibold tracking-tight text-text-primary">
          {role === "estudiante" ? <EnrollmentBrand /> : "ColoradosDrive"}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {/* Reserva el lugar de la unica campana que monta DashboardShell. */}
          {role === "estudiante" || role === "instructor" ? (
            <span aria-hidden="true" className="h-11 w-11" />
          ) : null}
          <ThemeToggle />
        </div>
      </header>
      <aside
        aria-label="Barra lateral"
        className={cn(
          "sticky top-0 hidden h-dvh w-[var(--sidebar-w)] min-w-0 shrink-0 flex-col border-r border-border bg-bg-surface transition-[width] duration-200 ease-out motion-reduce:transition-none md:flex",
          (role === "admin" || role === "estudiante" || role === "instructor") && styles.admin,
        )}
      >
        <div
          className={cn(
            "flex gap-2 py-4",
            collapsed ? "flex-col items-center px-2" : "items-center justify-between px-4",
          )}
        >
          {role === "admin" || role === "estudiante" || role === "instructor" ? (
            (() => {
              const logo = collapsed ? (
                <span className={styles.logoMark}>
                  <Image
                    unoptimized
                    src="/images/landing/logo.webp"
                    width={512}
                    height={256}
                    alt="Colorados Drive"
                    className={cn(styles.logoImage, styles.logoMarkImage)}
                  />
                </span>
              ) : (
                <Image
                  unoptimized
                  src="/images/landing/logo.webp"
                  width={512}
                  height={256}
                  alt="Colorados Drive"
                  className={cn(styles.logo, styles.logoImage)}
                />
              );
              return role === "admin" ? (
                <Link
                  href="/admin"
                  aria-label="Colorados Drive · Panel"
                  className={styles.logoLink}
                >
                  {logo}
                </Link>
              ) : (
                logo
              );
            })()
          ) : (
            <span className="text-base font-semibold tracking-tight text-text-primary">
              {collapsed ? "CD" : "ColoradosDrive"}
            </span>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expandir menú" : "Contraer menú"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-text-secondary transition-colors hover:bg-bg-sunken hover:text-text-primary"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              <rect
                x="3"
                y="4"
                width="14"
                height="12"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M8 4v12" stroke="currentColor" strokeWidth="1.5" />
              <path
                d={collapsed ? "m11.5 8 2 2-2 2" : "m13.5 8-2 2 2 2"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <nav
          aria-label="Navegación principal"
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto py-2",
            collapsed ? "px-2" : "px-3",
          )}
        >
          <SidebarCollapsed.Provider value={collapsed}>{navLinks}</SidebarCollapsed.Provider>
        </nav>
        <SidebarCollapsed.Provider value={collapsed}>
          <UserBlock email={email} role={role} />
        </SidebarCollapsed.Provider>
      </aside>
      {isOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            aria-hidden="true"
            onPointerDown={closeDrawer}
            className="absolute inset-0 bg-black/50"
          />
          <aside
            id="mobile-navigation"
            ref={drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            tabIndex={-1}
            className={cn(
              "absolute inset-y-0 left-0 flex w-[min(18rem,calc(100vw-2rem))] flex-col border-r border-border bg-bg-surface shadow-elevated",
              (role === "admin" || role === "estudiante" || role === "instructor") && styles.admin,
            )}
          >
            <div className="flex items-center justify-between px-4 py-3">
              {role === "admin" ? (
                <Link
                  href="/admin"
                  onClick={closeDrawer}
                  aria-label="Colorados Drive · Panel"
                  className={styles.logoLink}
                >
                  <Image
                    unoptimized
                    src="/images/landing/logo.webp"
                    width={512}
                    height={256}
                    alt="Colorados Drive"
                    className={cn(styles.logo, styles.logoImage)}
                  />
                </Link>
              ) : role === "estudiante" || role === "instructor" ? (
                <Image
                  unoptimized
                  src="/images/landing/logo.webp"
                  width={512}
                  height={256}
                  alt="Colorados Drive"
                  className={cn(styles.logo, styles.logoImage)}
                />
              ) : (
                <span className="font-semibold text-text-primary">ColoradosDrive</span>
              )}
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Cerrar menú"
                className="flex h-11 w-11 items-center justify-center rounded-sm text-text-secondary hover:bg-bg-sunken"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <nav
              aria-label="Navegación móvil"
              className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-2"
            >
              {navLinks}
            </nav>
            <UserBlock email={email} role={role} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
function SidebarLink({
  href,
  active,
  section,
  onClick,
  children,
  indicator,
}: {
  href: string;
  active: boolean;
  section: NavigationSection;
  onClick: () => void;
  children: ReactNode;
  indicator?: ReactNode;
}) {
  const collapsed = useContext(SidebarCollapsed);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={collapsed && typeof children === "string" ? children : undefined}
      onClick={onClick}
      className={cn(
        "relative flex min-h-11 items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-accent-red-subtle text-brand-ink before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-brand-primary"
          : "text-text-secondary hover:bg-bg-sunken hover:text-text-primary",
      )}
    >
      <NavigationIcon section={section} className="h-5 w-5 shrink-0" />
      <span className={cn("min-w-0", collapsed && "sr-only")}>{children}</span>
      {collapsed && indicator ? (
        <span className="absolute right-1 top-1 scale-75">{indicator}</span>
      ) : (
        indicator
      )}
    </Link>
  );
}
function UserBlock({ email, role }: SidebarProps) {
  const collapsed = useContext(SidebarCollapsed);
  const initials = email
    ? email
        .split("@")[0]
        .split(/[._\s-]+/)
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toLocaleUpperCase("es")
    : "CD";
  return (
    <div className={cn("mt-auto border-t border-border", collapsed ? "p-2" : "p-3")}>
      <div
        title={
          collapsed
            ? [email, role ? ROLE_LABELS[role] : null].filter(Boolean).join(" · ")
            : undefined
        }
        className={cn(
          "mb-2 flex min-w-0 items-center gap-2.5 rounded-sm px-1 py-2",
          collapsed && "justify-center",
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-sunken text-xs font-semibold text-text-secondary"
        >
          {initials}
        </span>
        <div className={cn("min-w-0 flex-1 text-xs leading-5", collapsed && "sr-only")}>
          {email ? (
            <p title={email} className="truncate font-medium text-text-primary">
              {email}
            </p>
          ) : null}
          <p className="text-text-secondary">{role ? ROLE_LABELS[role] : "Invitado"}</p>
        </div>
      </div>
      <LogoutButton compact={collapsed} />
    </div>
  );
}
