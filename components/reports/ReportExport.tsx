"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { useContentSuccess } from "@/components/content-admin/ContentFeedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useFetch } from "@/hooks/useFetch";
import { ApiError } from "@/lib/api/errors";
import {
  REPORT_FORMAT_LABELS,
  REPORT_MIN_DATE,
  REPORT_TYPE_LABELS,
  downloadReport,
  reportFilterSummary,
  saveReport,
  validateReportFilters,
  type ReportFilterErrors,
} from "@/lib/api/reports";
import { createClient } from "@/lib/supabase/client";
import { getUserRole } from "@/lib/supabase/getUserRole";
import { cn } from "@/lib/utils/cn";
import type { Cohort } from "@/types/cohort";
import type { Course } from "@/types/course";
import {
  REPORT_TYPES,
  type ReportFilters,
  type ReportFormat,
  type ReportSelection,
} from "@/types/report";
import type { Role } from "@/types/user";

// RF-08 · Exportar reportes a PDF y Excel (CD-346).
// Dos piezas reutilizables:
//  - <ReportExportMenu filters=… />: el botón «Exportar» con su resumen de
//    filtros, estados y errores. Es lo que debe montar el panel de CD-345 con
//    sus propios filtros.
//  - <ReportExport />: el menú más un formulario de filtros propio, para las
//    pantallas que aún no tienen filtros de reportes (resumen administrativo).
// Ambas se muestran solo al administrador; el servidor lo verifica de nuevo.

const FORMATS: ReportFormat[] = ["pdf", "xlsx"];
const SELECTIONS: ReportSelection[] = ["todos", ...REPORT_TYPES];

/** Rol de la sesión actual; null mientras se consulta o si no hay sesión. */
function useSessionRole(): Role | null {
  const [role, setRole] = useState<Role | null>(null);
  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled) setRole(getUserRole(data.session?.user));
      })
      .catch(() => {
        // Sin sesión legible no se muestra el control: el acceso lo decide el servidor.
        if (!cancelled) setRole(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return role;
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface ReportExportMenuProps {
  /** Filtros activos en pantalla: son exactamente los que se envían. */
  filters: ReportFilters;
  /** Nombre de la cohorte elegida, para el resumen. */
  cohortName?: string | null;
  /** Errores de validación ya calculados; con errores no se exporta. */
  errors?: ReportFilterErrors;
  /** Avisa al formulario del campo que el servidor rechazó. */
  onFieldError?: (field: string, message: string) => void;
  /** Permite forzar el rol (pruebas o un panel que ya lo conoce). */
  role?: Role | null;
  className?: string;
}

export function ReportExportMenu({
  filters,
  cohortName,
  errors,
  onFieldError,
  role: roleProp,
  className,
}: ReportExportMenuProps) {
  const sessionRole = useSessionRole();
  const role = roleProp === undefined ? sessionRole : roleProp;
  const notifySuccess = useContentSuccess();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<ReportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<{ url: string; name: string } | null>(null);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const fileUrl = useRef<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  const validation = useMemo(() => errors ?? validateReportFilters(filters), [errors, filters]);
  const invalid = Object.keys(validation).length > 0;
  const summary = reportFilterSummary(filters, cohortName);

  // Al desmontar: se cancela la petición en curso y se libera el archivo en memoria.
  useEffect(
    () => () => {
      controller.current?.abort();
      if (fileUrl.current) URL.revokeObjectURL(fileUrl.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (open) items.current[0]?.focus();
  }, [open]);

  const run = useCallback(
    async (formato: ReportFormat) => {
      // Evita el doble clic y las exportaciones solapadas.
      if (busy.current) return;
      setOpen(false);
      if (invalid) {
        setError("Corrige las fechas antes de exportar.");
        return;
      }
      busy.current = true;
      setExporting(formato);
      setError(null);
      const abort = new AbortController();
      controller.current = abort;
      try {
        const file = await downloadReport(filters, formato, abort.signal);
        if (abort.signal.aborted) return;
        if (fileUrl.current) URL.revokeObjectURL(fileUrl.current);
        const url = saveReport(file);
        fileUrl.current = url;
        setLastFile({ url, name: file.fileName });
        notifySuccess("Reporte descargado");
      } catch (caught) {
        if (abort.signal.aborted) return;
        const message =
          caught instanceof ApiError
            ? caught.message
            : "No se pudo exportar el reporte. Inténtalo de nuevo.";
        if (caught instanceof ApiError && caught.status === 400 && caught.field)
          onFieldError?.(caught.field, caught.message);
        setError(message);
      } finally {
        if (controller.current === abort) controller.current = null;
        busy.current = false;
        if (!abort.signal.aborted) {
          setExporting(null);
          trigger.current?.focus();
        }
      }
    },
    [filters, invalid, notifySuccess, onFieldError],
  );

  function onMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const index = items.current.findIndex((item) => item === document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      items.current[(index + step + FORMATS.length) % FORMATS.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items.current[event.key === "Home" ? 0 : FORMATS.length - 1]?.focus();
    } else if (event.key === "Tab") setOpen(false);
  }

  // Solo el administrador ve el control (y con él, el ranking de instructores).
  if (role !== "admin") return null;

  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <dl
          aria-label="Filtros que se aplicarán al reporte"
          className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary"
        >
          {summary.map((item) => (
            <div key={item.label} className="flex min-w-0 gap-1">
              <dt className="shrink-0">{item.label}:</dt>
              <dd className="min-w-0 break-words font-medium text-text-primary">{item.value}</dd>
            </div>
          ))}
        </dl>
        <div ref={container} className="relative shrink-0">
          <Button
            ref={trigger}
            type="button"
            className="w-full md:w-auto"
            icon={<DownloadIcon />}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            aria-busy={exporting !== null}
            disabled={exporting !== null}
            onClick={() => setOpen((value) => !value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && !open) {
                event.preventDefault();
                setOpen(true);
              }
            }}
          >
            {exporting ? `Generando ${REPORT_FORMAT_LABELS[exporting]}…` : "Exportar"}
          </Button>
          {open ? (
            <div
              id={menuId}
              role="menu"
              aria-label="Formato de exportación"
              onKeyDown={onMenuKeyDown}
              className="absolute right-0 z-30 mt-1 w-full min-w-44 rounded-sm border border-border-strong bg-bg-surface-raised p-1 shadow-lg md:w-52"
            >
              {FORMATS.map((formato, index) => (
                <button
                  key={formato}
                  ref={(node) => {
                    items.current[index] = node;
                  }}
                  type="button"
                  role="menuitem"
                  className="flex min-h-11 w-full items-center rounded-sm px-3 text-left text-sm text-text-primary hover:bg-bg-sunken focus-visible:bg-bg-sunken md:min-h-10"
                  onClick={() => void run(formato)}
                >
                  {formato === "pdf" ? "Descargar en PDF" : "Descargar en Excel"}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {exporting ? `Generando el reporte en ${REPORT_FORMAT_LABELS[exporting]}…` : ""}
      </p>
      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-status-error bg-status-error-bg px-3 py-2 text-sm text-status-error"
        >
          <p className="min-w-0">{error}</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setError(null)}>
            Cerrar aviso
          </Button>
        </div>
      ) : null}
      {lastFile && !exporting && !error ? (
        <p className="text-sm text-text-secondary">
          ¿No empezó la descarga?{" "}
          <a
            href={lastFile.url}
            download={lastFile.name}
            target="_blank"
            rel="noopener"
            className="font-medium text-accent-red underline underline-offset-2"
          >
            Abrir {lastFile.name}
          </a>
        </p>
      ) : null}
    </div>
  );
}

export interface ReportExportProps {
  /** Hoy en hora de Ecuador (AAAA-MM-DD); limita el calendario. */
  today: string;
  /** Período inicial; por defecto, del primer día del mes de `today` a hoy. */
  defaultDesde?: string;
  defaultHasta?: string;
  role?: Role | null;
  className?: string;
}

export function ReportExport({
  today,
  defaultDesde,
  defaultHasta,
  role: roleProp,
  className,
}: ReportExportProps) {
  const sessionRole = useSessionRole();
  const role = roleProp === undefined ? sessionRole : roleProp;
  const headingId = useId();
  const [filters, setFilters] = useState<ReportFilters>({
    desde: defaultDesde ?? `${today.slice(0, 7)}-01`,
    hasta: defaultHasta ?? today,
    tipoCurso: "todos",
    cohorteId: "",
    tipo: "todos",
  });
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const cohorts = useFetch<Cohort[]>("/cohorts");
  const courses = useFetch<Course[]>("/courses");

  const courseType = useMemo(
    () => new Map((courses.data ?? []).map((course) => [course.id, course.tipo])),
    [courses.data],
  );
  const cohortOptions = useMemo(
    () =>
      (cohorts.data ?? [])
        .filter(
          (cohort) =>
            filters.tipoCurso === "todos" || courseType.get(cohort.courseId) === filters.tipoCurso,
        )
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [cohorts.data, courseType, filters.tipoCurso],
  );
  const cohortName =
    (cohorts.data ?? []).find((cohort) => cohort.id === filters.cohorteId)?.nombre ?? null;
  const errors = validateReportFilters(filters);

  const update = (patch: Partial<ReportFilters>) => {
    setServerErrors({});
    setFilters((current) => {
      const next = { ...current, ...patch };
      // Al cambiar el tipo de curso se suelta una cohorte que ya no corresponde.
      if (patch.tipoCurso && patch.tipoCurso !== "todos" && next.cohorteId) {
        const cohort = (cohorts.data ?? []).find((item) => item.id === next.cohorteId);
        if (!cohort || courseType.get(cohort.courseId) !== patch.tipoCurso) next.cohorteId = "";
      }
      return next;
    });
  };
  const onFieldError = useCallback(
    (field: string, message: string) => setServerErrors({ [field]: message }),
    [],
  );

  if (role !== "admin") return null;

  return (
    <section
      aria-labelledby={headingId}
      className={cn("min-w-0 rounded-md border border-border bg-bg-surface p-4 md:p-5", className)}
    >
      <div className="mb-4">
        <h2
          id={headingId}
          className="font-display text-lg font-semibold tracking-tight text-text-primary"
        >
          Exportar reportes
        </h2>
        <p className="text-sm text-text-secondary">
          Descarga los indicadores del período en PDF o en Excel. Las fechas usan la hora de
          Ecuador.
        </p>
      </div>
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="mb-4 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"
      >
        <Input
          label="Desde"
          id={`${headingId}-desde`}
          name="desde"
          type="date"
          value={filters.desde}
          min={REPORT_MIN_DATE}
          max={today}
          required
          error={errors.desde ?? serverErrors.desde}
          onChange={(event) => update({ desde: event.target.value })}
        />
        <Input
          label="Hasta"
          id={`${headingId}-hasta`}
          name="hasta"
          type="date"
          value={filters.hasta}
          min={filters.desde || REPORT_MIN_DATE}
          required
          error={errors.hasta ?? serverErrors.hasta}
          onChange={(event) => update({ hasta: event.target.value })}
        />
        <Select
          label="Tipo de curso"
          id={`${headingId}-tipo-curso`}
          name="tipoCurso"
          value={filters.tipoCurso}
          error={serverErrors.tipoCurso}
          onChange={(event) =>
            update({ tipoCurso: event.target.value as ReportFilters["tipoCurso"] })
          }
        >
          <option value="todos">Todos</option>
          <option value="A">Tipo A (motocicleta)</option>
          <option value="B">Tipo B (vehículos livianos)</option>
        </Select>
        <Select
          label="Cohorte"
          id={`${headingId}-cohorte`}
          name="cohorteId"
          value={filters.cohorteId}
          disabled={cohorts.isLoading}
          error={
            serverErrors.cohorteId ??
            (cohorts.error ? "No se pudieron cargar las cohortes." : undefined)
          }
          onChange={(event) => update({ cohorteId: event.target.value })}
        >
          <option value="">{cohorts.isLoading ? "Cargando cohortes…" : "Todas"}</option>
          {cohortOptions.map((cohort) => (
            <option key={cohort.id} value={cohort.id}>
              {cohort.nombre}
            </option>
          ))}
        </Select>
        <Select
          label="Reporte"
          id={`${headingId}-tipo`}
          name="tipo"
          value={filters.tipo}
          error={serverErrors.tipo}
          onChange={(event) => update({ tipo: event.target.value as ReportSelection })}
        >
          {SELECTIONS.map((selection) => (
            <option key={selection} value={selection}>
              {REPORT_TYPE_LABELS[selection]}
            </option>
          ))}
        </Select>
      </form>
      <ReportExportMenu
        filters={filters}
        cohortName={cohortName}
        errors={errors}
        onFieldError={onFieldError}
        role={role}
      />
    </section>
  );
}
