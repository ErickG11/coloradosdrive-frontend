"use client";

import { useState } from "react";

import {
  Button,
  DataTable,
  EmptyState,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  StatusBadge,
  type DataColumn,
} from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { InstructorDetail, InstructorList, InstructorSummary } from "@/types";

import { InstructorForm } from "./InstructorForm";
import { InstructorMetrics } from "./InstructorMetrics";
import { InstructorProfile } from "./InstructorProfile";
import { InstructorAvatar, InstructorIcon } from "./InstructorVisual";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import styles from "./instructors.module.css";

type Action = "desactivar" | "reactivar" | "restablecer-password";
type Dialog = "closed" | "create" | "detail" | "edit" | "confirm";

export default function InstructorsPage() {
  const [searchDraft, setSearchDraft] = useState("");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog>("closed");
  const [selected, setSelected] = useState<InstructorDetail | null>(null);
  const [action, setAction] = useState<Action>("desactivar");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [metricsVersion, setMetricsVersion] = useState(0);
  const pageSize = 10;

  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (query) params.set("q", query);
  if (activeFilter) params.set("activo", activeFilter);
  const { data, isLoading, error, refetch } = useFetch<InstructorList>(
    `/admin/instructores?${params.toString()}`,
  );
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  async function openDetail(id: string) {
    setActionError(null);
    setActionSuccess(null);
    setBusy(true);
    try {
      const instructor = await api.get<InstructorDetail>(`/admin/instructores/${id}`);
      setSelected(instructor);
      setDialog("detail");
    } catch (cause) {
      setActionError(
        cause instanceof ApiError ? cause.message : "No se pudo consultar el instructor.",
      );
    } finally {
      setBusy(false);
    }
  }

  function saved() {
    setDialog("closed");
    setSelected(null);
    refetch();
    setMetricsVersion((version) => version + 1);
  }

  function ask(actionToConfirm: Action) {
    setAction(actionToConfirm);
    setActionError(null);
    setActionSuccess(null);
    setDialog("confirm");
  }

  async function confirmAction() {
    if (!selected) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.post<InstructorDetail | void>(`/admin/instructores/${selected.id}/${action}`);
      if (action === "restablecer-password") {
        setActionSuccess("Se envió una contraseña temporal al correo del instructor.");
      }
      setDialog("closed");
      setSelected(null);
      refetch();
      setMetricsVersion((version) => version + 1);
    } catch (cause) {
      setActionError(cause instanceof ApiError ? cause.message : "No se pudo completar la acción.");
    } finally {
      setBusy(false);
    }
  }

  function createInstructor() {
    setActionError(null);
    setDialog("create");
  }
  function clearFilters() {
    setSearchDraft("");
    setQuery("");
    setActiveFilter("");
    setPage(1);
  }
  const filtered = Boolean(query || activeFilter);
  const columns: DataColumn<InstructorSummary>[] = [
    {
      key: "name",
      header: "Nombre",
      className: "data-table__identity",
      render: (instructor) => (
        <div className={styles.identity}>
          <InstructorAvatar instructor={instructor} />
          <strong>{instructor.nombreCompleto}</strong>
        </div>
      ),
    },
    {
      key: "cedula",
      header: "Cédula",
      render: (instructor) => <span className={styles.numeric}>{instructor.cedula}</span>,
    },
    {
      key: "phone",
      header: "Teléfono",
      render: (instructor) => <span className={styles.numeric}>{instructor.telefono ?? "—"}</span>,
    },
    {
      key: "state",
      header: "Estado",
      render: (instructor) => <StatusBadge status={instructor.activo ? "activo" : "inactivo"} />,
    },
    {
      key: "actions",
      header: "Acciones",
      className: styles.tableActions,
      render: (instructor) => (
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void openDetail(instructor.id)}
        >
          <InstructorIcon name="eye" />
          Ver y gestionar
        </Button>
      ),
    },
  ];
  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <PageHeader
          title="Instructores"
          count={data?.total}
          description="Gestiona los instructores de tu escuela de conducción."
          actions={
            <Button onClick={createInstructor}>
              <InstructorIcon name="plus" />
              Nuevo instructor
            </Button>
          }
        />
        <InstructorMetrics version={metricsVersion} />
        <section className={styles.filters} aria-label="Buscar y filtrar instructores">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setQuery(searchDraft.trim());
            }}
            className={styles.searchForm}
          >
            <SearchInput
              name="instructorSearch"
              label="Buscar por nombre o cédula"
              placeholder="Buscar por nombre o cédula…"
              maxLength={80}
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onClear={() => {
                setSearchDraft("");
                setQuery("");
                setPage(1);
              }}
            />
            <Button type="submit" variant="secondary">
              Buscar
            </Button>
          </form>
          <Select
            name="instructorActive"
            label="Estado"
            value={activeFilter}
            onChange={(event) => {
              setPage(1);
              setActiveFilter(event.target.value);
            }}
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </Select>
          {filtered && (
            <Button variant="ghost" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
        </section>
        {actionError && dialog === "closed" && (
          <p role="alert" className={styles.error}>
            {actionError}
          </p>
        )}
        {actionSuccess && (
          <p role="status" className={styles.success}>
            {actionSuccess}
          </p>
        )}
        {busy && dialog === "closed" && (
          <p role="status" className={styles.loadingDetail}>
            Consultando ficha…
          </p>
        )}
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          getRowKey={(instructor) => instructor.id}
          caption="Listado de instructores"
          mobileCards
          isLoading={isLoading}
          loadingLabel="Cargando instructores…"
          error={error}
          onRetry={refetch}
          empty={
            <EmptyState
              title={
                filtered ? "No hay instructores para estos filtros." : "Todavía no hay instructores"
              }
              description={
                filtered
                  ? "Prueba con otro nombre, cédula o estado."
                  : "Crea el primer instructor para comenzar a gestionar tu equipo."
              }
              action={
                <Button
                  variant={filtered ? "secondary" : "primary"}
                  onClick={filtered ? clearFilters : createInstructor}
                >
                  {filtered ? "Limpiar filtros" : "Nuevo instructor"}
                </Button>
              }
            />
          }
        />
        {!isLoading && !error && (
          <nav aria-label="Paginación de instructores" className={styles.pagination}>
            <span>
              {data?.total ?? 0} instructores · Página {page} de {totalPages}
            </span>
            <div>
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Siguiente
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </nav>
        )}
      </div>
      <Modal
        isOpen={dialog === "create"}
        onClose={() => setDialog("closed")}
        title="Nuevo instructor"
        className={styles.modal}
      >
        <InstructorForm onSaved={saved} onCancel={() => setDialog("closed")} />
      </Modal>
      <Modal
        isOpen={dialog === "edit"}
        onClose={() => setDialog("detail")}
        title="Editar instructor"
        className={styles.modal}
      >
        {selected && (
          <InstructorForm
            key={selected.id}
            instructor={selected}
            onSaved={saved}
            onCancel={() => setDialog("detail")}
          />
        )}
      </Modal>
      <Modal
        isOpen={dialog === "detail"}
        onClose={() => setDialog("closed")}
        title="Instructor"
        className={styles.modal}
      >
        {selected && (
          <InstructorProfile instructor={selected} onEdit={() => setDialog("edit")} onAsk={ask} />
        )}
      </Modal>
      <Modal
        isOpen={dialog === "confirm"}
        onClose={() => setDialog("detail")}
        title="Confirmar acción"
        className={styles.confirmModal}
      >
        <div className={styles.confirmContent}>
          <p>
            {action === "restablecer-password"
              ? "Se enviará una contraseña temporal al correo del instructor y deberá cambiarla al entrar"
              : "¿Confirmas " +
                action.replaceAll("-", " ") +
                " para " +
                selected?.nombreCompleto +
                "?"}
          </p>
          {actionError && (
            <p role="alert" className={styles.error}>
              {actionError}
            </p>
          )}
          <div className={styles.confirmButtons}>
            <Button variant="secondary" onClick={() => setDialog("detail")}>
              Cancelar
            </Button>
            <Button
              variant={action === "desactivar" ? "danger" : "primary"}
              isLoading={busy}
              onClick={() => void confirmAction()}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
