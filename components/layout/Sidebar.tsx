"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { XIcon } from "@/components/ui/icons";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { cn } from "@/lib/utils/cn";
import type { Role } from "@/types/user";
import { LogoutButton } from "./LogoutButton";
import { NavigationIcon, type NavigationSection } from "./NavigationIcon";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  estudiante: "Estudiante",
  instructor: "Instructor",
};
interface SidebarProps {
  email: string | null;
  role: Role | null;
}

export function Sidebar({ email, role }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const drawer = useRef<HTMLElement>(null);
  const isInstructorScheduleActive =
    pathname.startsWith("/instructor/schedule");
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
            href="/admin/practice-slots"
            active={pathname.startsWith("/admin/practice-slots")}
            section="schedule"
            onClick={closeDrawer}
          >
            Horarios de práctica
          </SidebarLink>
        </>
      ) : null}
      {role === "estudiante" ? (
        <>
          <SidebarLink
            href="/student/exams"
            active={pathname.startsWith("/student/exams")}
            section="exams"
            onClick={closeDrawer}
          >
            Exámenes
          </SidebarLink>
          <SidebarLink
            href="/student/schedule"
            active={pathname.startsWith("/student/schedule")}
            section="schedule"
            onClick={closeDrawer}
          >
            Horarios de práctica
          </SidebarLink>
        </>
      ) : null}
      {role === "instructor" ? (
        <SidebarLink
          href="/instructor/schedule"
          active={isInstructorScheduleActive}
          section="schedule"
          onClick={closeDrawer}
        >
          Horarios de práctica
        </SidebarLink>
      ) : null}
    </>
  );
  return (
    <>
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
        <span className="text-base font-semibold tracking-tight text-text-primary">
          ColoradosDrive
        </span>
        <ThemeToggle />
      </header>
      <aside
        aria-label="Barra lateral"
        className="sticky top-0 hidden h-dvh w-[var(--sidebar-width)] min-w-0 shrink-0 flex-col border-r border-border bg-bg-surface md:flex"
      >
        <div className="flex items-center justify-between gap-1 px-4 py-4">
          <span className="text-base font-semibold tracking-tight text-text-primary">
            ColoradosDrive
          </span>
          <ThemeToggle />
        </div>
        <nav
          aria-label="Navegación principal"
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-2"
        >
          {navLinks}
        </nav>
        <UserBlock email={email} role={role} />
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
            className="absolute inset-y-0 left-0 flex w-[min(18rem,calc(100vw-2rem))] flex-col border-r border-border bg-bg-surface shadow-elevated"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <span className="font-semibold text-text-primary">ColoradosDrive</span>
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
}: {
  href: string;
  active: boolean;
  section: NavigationSection;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent-red-subtle text-brand-ink"
          : "text-text-secondary hover:bg-bg-sunken hover:text-text-primary",
      )}
    >
      <NavigationIcon section={section} className="h-5 w-5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </Link>
  );
}
function UserBlock({ email, role }: SidebarProps) {
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
    <div className="mt-auto border-t border-border p-3">
      <div className="mb-2 flex min-w-0 items-center gap-2.5 rounded-sm px-1 py-2">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-sunken text-xs font-semibold text-text-secondary"
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1 text-xs leading-5">
          {email ? (
            <p title={email} className="truncate font-medium text-text-primary">
              {email}
            </p>
          ) : null}
          <p className="text-text-secondary">{role ? ROLE_LABELS[role] : "Invitado"}</p>
        </div>
      </div>
      <LogoutButton />
    </div>
  );
}
