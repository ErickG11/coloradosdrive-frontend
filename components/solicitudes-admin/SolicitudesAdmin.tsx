"use client";
import { useRef, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { DataTable } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Pagination } from "@/components/ui/Pagination";
import { solicitudes } from "@/lib/api/solicitudes";
import type { SolicitudAdmin, SolicitudPage } from "@/types/solicitud";
import { Toast } from "@/components/inscripcion/Toast";
import { SolicitudDetail } from "./SolicitudDetail";
import { SolicitudStatus } from "./SolicitudStatus";
import styles from "./solicitudes.module.css";
export function SolicitudesAdmin() {
  const [estado, setEstado] = useState(""),
    [draft, setDraft] = useState(""),
    [q, setQ] = useState(""),
    [page, setPage] = useState(1);
  const query = new URLSearchParams({
    page: String(page),
    pageSize: "20",
    ...(estado ? { estado } : {}),
    ...(q ? { q } : {}),
  });
  const { data, isLoading, error, refetch } = useFetch<SolicitudPage>(
    `/admin/solicitudes?${query}`,
  );
  const [message, setMessage] = useState(""),
    [selected, setSelected] = useState<SolicitudAdmin | null>(null);
  const openers = useRef(new Map<string, HTMLButtonElement>()),
    heading = useRef<HTMLHeadingElement>(null);
  const rows = data?.items ?? [];
  function close() {
    const opener = selected ? openers.current.get(selected.id) : null;
    setSelected(null);
    (opener ?? heading.current)?.focus();
  }
  async function refreshSelected() {
    if (!selected) return;
    // El filtro de la tabla puede ocultar una solicitud que otra pestaña decidió.
    const result = await solicitudes.list(
      new URLSearchParams({ q: selected.cedula, page: "1", pageSize: "100" }),
    );
    const current = result.items.find((item) => item.id === selected.id);
    if (current) setSelected((previous) => (previous?.id === selected.id ? current : previous));
    else throw new Error("No se pudo recuperar la solicitud");
    refetch();
  }
  return (
    <div className={styles.workspace}>
      <h1 ref={heading} tabIndex={-1}>
        Solicitudes de inscripción
      </h1>
      <Toast message={message} onDismiss={() => setMessage("")} />
      <div className={styles.filters}>
        <Select
          label="Estado"
          value={estado}
          onChange={(event) => {
            setEstado(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas</option>
          <option value="pendiente_revision">Pendientes</option>
          <option value="aprobada">Aprobadas</option>
          <option value="rechazada">Rechazadas</option>
          <option value="con_documentos_por_revisar">Con documentos por revisar</option>
        </Select>
        <form
          className={styles.controls}
          onSubmit={(event) => {
            event.preventDefault();
            setQ(draft.trim());
            setPage(1);
          }}
        >
          <Input
            label="Buscar por cédula, nombre o correo"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={100}
          />
          <Button type="submit">Buscar</Button>
        </form>
      </div>
      {data ? <FormError>{error}</FormError> : null}
      <div className={styles.tableArea} aria-busy={isLoading}>
        <DataTable<SolicitudAdmin>
          caption="Solicitudes de inscripción"
          rows={rows}
          getRowKey={(item) => item.id}
          isLoading={isLoading && !data}
          error={data ? null : error}
          onRetry={refetch}
          mobileCards
          columns={[
            { key: "nombre", header: "Postulante", render: (item) => item.nombreCompleto },
            { key: "cedula", header: "Cédula", render: (item) => item.cedula },
            { key: "correo", header: "Correo", render: (item) => item.correo },
            {
              key: "enviada",
              header: "Fecha de envío",
              render: (item) =>
                item.enviadaAt
                  ? new Date(item.enviadaAt).toLocaleString("es-EC", {
                      timeZone: "America/Guayaquil",
                    })
                  : "—",
            },
            {
              key: "detail",
              header: "Revisión",
              render: (item) => (
                <Button
                  variant="secondary"
                  ref={(button) => {
                    if (button) openers.current.set(item.id, button);
                    else openers.current.delete(item.id);
                  }}
                  data-selected={selected?.id === item.id}
                  aria-expanded={selected?.id === item.id}
                  aria-controls={selected?.id === item.id ? "solicitud-panel" : undefined}
                  onClick={() => setSelected(item)}
                >
                  Revisar solicitud
                </Button>
              ),
            },
            {
              key: "estado",
              header: "Estado",
              render: (item) => (
                <>
                  <SolicitudStatus estado={item.estado} />
                  {Boolean(item.documentosPorRevisar) ? (
                    <span className="mt-2 block text-xs text-status-info">
                      Documentos por revisar ({item.documentosPorRevisar})
                    </span>
                  ) : null}
                </>
              ),
            },
          ]}
        />
      </div>
      {selected ? (
        <SolicitudDetail
          key={selected.id}
          solicitud={selected}
          onClose={close}
          onRefresh={refreshSelected}
          onDone={(notice, result) => {
            window.dispatchEvent(new Event("solicitudes-actualizadas"));
            setMessage(notice);
            if (result)
              setSelected((current) => (current ? { ...current, estado: result.estado } : null));
            refetch();
          }}
        />
      ) : null}
      <Pagination
        total={data?.total ?? 0}
        page={page}
        pageSize={20}
        singular="solicitud"
        plural="solicitudes"
        onPageChange={setPage}
        disabled={isLoading}
      />
    </div>
  );
}
