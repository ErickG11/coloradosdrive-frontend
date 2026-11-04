"use client";
import { useEffect, useRef, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormError } from "@/components/ui/FormError";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { estadoDeTab } from "@/lib/api/inscripcion";
import type { ListaSolicitudes, SolicitudAdminItem, TabSolicitudes } from "@/types/inscripcion";
import { InscripcionesSwitch } from "./InscripcionesSwitch";
import { MedidoresDiarios } from "./MedidoresDiarios";
import { SolicitudDetail } from "./SolicitudDetail";
import { SolicitudStatus } from "./SolicitudStatus";
import { ID_PANEL_SOLICITUDES, SolicitudesTabs, idDeTab } from "./SolicitudesTabs";
import { formatearFecha, nombreDe, superaHoras } from "./catalogo";
import { useResumenSolicitudes } from "./useResumenSolicitudes";
import { SOLICITUD_CHANGED_EVENT } from "./useSolicitudSummary";
import styles from "./solicitudes.module.css";

const PAGE_SIZE = 20;

export function SolicitudesAdmin() {
  const [tab, setTab] = useState<TabSolicitudes>("pendientes"),
    [borrador, setBorrador] = useState(""),
    [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [seleccionada, setSeleccionada] = useState<SolicitudAdminItem | null>(null),
    [ahora, setAhora] = useState(() => Date.now());
  const { resumen, fallo, setResumen } = useResumenSolicitudes();

  const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  const estado = estadoDeTab(tab);
  if (estado) query.set("estado", estado);
  if (q) query.set("q", q);
  const { data, isLoading, error, refetch } = useFetch<ListaSolicitudes>(
    `/admin/solicitudes?${query.toString()}`,
  );

  const aperturas = useRef(new Map<string, HTMLButtonElement>());
  const titulo = useRef<HTMLHeadingElement>(null);

  // La insignia «Más de 48 h» se recalcula cada minuto sin recargar la lista.
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Cuando el contador del menú detecta un cambio (decisión propia o de otra sesión) la lista
  // visible también se refresca para no mostrar filas ya decididas.
  useEffect(() => {
    window.addEventListener(SOLICITUD_CHANGED_EVENT, refetch);
    return () => window.removeEventListener(SOLICITUD_CHANGED_EVENT, refetch);
  }, [refetch]);

  function cerrarDetalle() {
    const apertura = seleccionada ? aperturas.current.get(seleccionada.id) : null;
    setSeleccionada(null);
    // La fila puede haber salido de la pestaña tras una decisión: el título recibe el foco.
    requestAnimationFrame(() => (apertura?.isConnected ? apertura : titulo.current)?.focus());
  }

  const filas = data?.items ?? [];
  const conteos: Partial<Record<TabSolicitudes, number>> = resumen
    ? { pendientes: resumen.pendientes, devueltas: resumen.devueltas }
    : {};

  return (
    <div className={styles.workspace}>
      <header className={styles.moduleHeader}>
        <div>
          <h1 ref={titulo} tabIndex={-1}>
            Solicitudes de inscripción
          </h1>
          <p className={styles.lead}>
            Revisa a quienes se inscriben en línea: verifica su identidad y estudios en la fuente y
            decide.
          </p>
        </div>
        <InscripcionesSwitch
          abiertas={resumen ? resumen.inscripcionesAbiertas : null}
          onChanged={(abiertas) =>
            setResumen((previo) =>
              previo ? { ...previo, inscripcionesAbiertas: abiertas } : previo,
            )
          }
        />
      </header>
      {fallo && !resumen ? (
        <FormError>
          No se pudo consultar el resumen del día. Se reintentará automáticamente.
        </FormError>
      ) : null}
      <MedidoresDiarios resumen={resumen} />
      {resumen && resumen.conMasDe48h > 0 ? (
        <p className={styles.overdueNote}>
          {resumen.conMasDe48h === 1
            ? "1 solicitud lleva más de 48 h esperando revisión."
            : `${resumen.conMasDe48h} solicitudes llevan más de 48 h esperando revisión.`}
        </p>
      ) : null}

      <SolicitudesTabs
        activa={tab}
        conteos={conteos}
        onSelect={(siguiente) => {
          setTab(siguiente);
          setPage(1);
        }}
      />
      <form
        className={styles.controls}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setQ(borrador.trim());
          setPage(1);
        }}
      >
        <Input
          label="Buscar por cédula, nombre o correo"
          type="search"
          value={borrador}
          onChange={(event) => setBorrador(event.target.value)}
          maxLength={100}
        />
        <Button type="submit">Buscar</Button>
        {q ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setBorrador("");
              setQ("");
              setPage(1);
            }}
          >
            Quitar búsqueda
          </Button>
        ) : null}
      </form>

      <div
        id={ID_PANEL_SOLICITUDES}
        role="tabpanel"
        aria-labelledby={idDeTab(tab)}
        className={styles.tableArea}
        aria-busy={isLoading}
      >
        {data && error ? <FormError>{error}</FormError> : null}
        <DataTable<SolicitudAdminItem>
          caption="Solicitudes de inscripción"
          rows={filas}
          getRowKey={(item) => item.id}
          isLoading={isLoading && !data}
          error={data ? null : error}
          onRetry={refetch}
          mobileCards
          empty={
            <EmptyState
              title={q ? "Sin resultados" : "No hay solicitudes en esta pestaña"}
              description={
                q
                  ? "Ninguna solicitud coincide con la búsqueda."
                  : "Cuando lleguen solicitudes aparecerán aquí."
              }
            />
          }
          columns={[
            {
              key: "nombre",
              header: "Postulante",
              render: (item) => (
                <span className={styles.person}>
                  <span>{nombreDe(item)}</span>
                  {item.estado === "enviada" && superaHoras(item.enviadaAt, ahora) ? (
                    <span className={styles.overdueBadge}>Más de 48 h</span>
                  ) : null}
                </span>
              ),
            },
            { key: "cedula", header: "Cédula", render: (item) => item.cedula ?? "—" },
            { key: "correo", header: "Correo", render: (item) => item.correo },
            {
              key: "enviada",
              header: "Fecha de envío",
              render: (item) => (item.enviadaAt ? formatearFecha(item.enviadaAt) : "—"),
            },
            {
              key: "estado",
              header: "Estado",
              render: (item) => <SolicitudStatus estado={item.estado} />,
            },
            {
              key: "detalle",
              header: "Revisión",
              render: (item) => (
                <Button
                  variant="secondary"
                  ref={(button) => {
                    if (button) aperturas.current.set(item.id, button);
                    else aperturas.current.delete(item.id);
                  }}
                  data-selected={seleccionada?.id === item.id}
                  aria-label={`Revisar solicitud de ${nombreDe(item)}`}
                  aria-expanded={seleccionada?.id === item.id}
                  aria-controls={seleccionada?.id === item.id ? "solicitud-panel" : undefined}
                  onClick={() => setSeleccionada(item)}
                >
                  Revisar
                </Button>
              ),
            },
          ]}
        />
      </div>
      <Pagination
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        singular="solicitud"
        plural="solicitudes"
        onPageChange={setPage}
        disabled={isLoading}
      />
      {seleccionada ? (
        <SolicitudDetail
          key={seleccionada.id}
          item={seleccionada}
          onClose={cerrarDetalle}
          onChanged={() => {
            window.dispatchEvent(new Event(SOLICITUD_CHANGED_EVENT));
          }}
        />
      ) : null}
    </div>
  );
}
