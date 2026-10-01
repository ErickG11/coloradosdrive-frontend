"use client";

import { useState } from "react";

import { Button, Input, Modal, Select } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { InstructorDetail, InstructorList } from "@/types";

import { InstructorForm } from "./InstructorForm";

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
      setActionError(cause instanceof ApiError ? cause.message : "No se pudo consultar el instructor.");
    } finally {
      setBusy(false);
    }
  }

  function saved() {
    setDialog("closed");
    setSelected(null);
    refetch();
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
    } catch (cause) {
      setActionError(cause instanceof ApiError ? cause.message : "No se pudo completar la acción.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-text-primary">Instructores</h1>
        <Button onClick={() => { setActionError(null); setDialog("create"); }}>Nuevo instructor</Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <form className="flex flex-1 flex-wrap items-end gap-2" onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(searchDraft.trim());
        }}>
          <Input name="instructorSearch" label="Buscar por nombre o cédula"
            maxLength={80} value={searchDraft} className="min-w-56"
            onChange={(event) => setSearchDraft(event.target.value)} />
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <Select name="instructorActive" label="Estado" value={activeFilter}
          onChange={(event) => { setPage(1); setActiveFilter(event.target.value); }}>
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </Select>
      </div>

      {isLoading ? <p role="status" className="text-sm text-text-secondary">Cargando…</p> : null}
      {error ? <p role="alert" className="text-sm text-accent-red">{error}</p> : null}
      {actionError && dialog === "closed" ?
        <p role="alert" className="text-sm text-accent-red">{actionError}</p> : null}
      {actionSuccess ? <p role="status" className="text-sm text-accent-blue">{actionSuccess}</p> : null}
      {!isLoading && !error ? (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-bg-surface">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-bg-sunken">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Nombre</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Cédula</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Teléfono</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Estado</th>
                  <th className="px-4 py-2 text-right font-medium text-text-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.items ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                    No hay instructores para estos filtros.
                  </td></tr>
                ) : data?.items.map((instructor) => (
                  <tr key={instructor.id}>
                    <td className="px-4 py-3 text-text-primary">{instructor.nombreCompleto}</td>
                    <td className="px-4 py-3 text-text-secondary">{instructor.cedula}</td>
                    <td className="px-4 py-3 text-text-secondary">{instructor.telefono ?? "—"}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {instructor.activo ? "Activo" : "Inactivo"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="secondary" disabled={busy}
                        onClick={() => void openDetail(instructor.id)}>
                        Ver y gestionar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
            <span>{data?.total ?? 0} instructores · Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}>Anterior</Button>
              <Button size="sm" variant="secondary" disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}>Siguiente</Button>
            </div>
          </div>
        </>
      ) : null}

      <Modal isOpen={dialog === "create"} onClose={() => setDialog("closed")}
        title="Nuevo instructor">
        <InstructorForm onSaved={saved} onCancel={() => setDialog("closed")} />
      </Modal>
      <Modal isOpen={dialog === "edit"} onClose={() => setDialog("detail")}
        title="Editar instructor">
        {selected ? <InstructorForm key={selected.id} instructor={selected} onSaved={saved}
          onCancel={() => setDialog("detail")} /> : null}
      </Modal>
      <Modal isOpen={dialog === "detail"} onClose={() => setDialog("closed")}
        title="Instructor">
        {selected ? (
          <div className="flex flex-col gap-4 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div><dt className="text-text-secondary">Nombre</dt><dd>{selected.nombreCompleto}</dd></div>
              <div><dt className="text-text-secondary">Cédula</dt><dd>{selected.cedula}</dd></div>
              <div><dt className="text-text-secondary">Correo</dt><dd className="break-all">{selected.correo}</dd></div>
              <div><dt className="text-text-secondary">Teléfono</dt><dd>{selected.telefono ?? "—"}</dd></div>
              <div><dt className="text-text-secondary">Estado</dt><dd>{selected.activo ? "Activo" : "Inactivo"}</dd></div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setDialog("edit")}>Editar</Button>
              <Button variant={selected.activo ? "danger" : "secondary"}
                onClick={() => ask(selected.activo ? "desactivar" : "reactivar")}>
                {selected.activo ? "Desactivar" : "Reactivar"}
              </Button>
              {selected.activo ? (
                <Button variant="secondary" onClick={() => ask("restablecer-password")}>
                  Restablecer contraseña
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
      <Modal isOpen={dialog === "confirm"} onClose={() => setDialog("detail")}
        title="Confirmar acción">
        <div className="flex flex-col gap-4">
          <p>{action === "restablecer-password"
            ? "Se enviará una contraseña temporal al correo del instructor y deberá cambiarla al entrar"
            : `¿Confirmas ${action.replaceAll("-", " ")} para ${selected?.nombreCompleto}?`}</p>
          {actionError ? <p role="alert" className="text-sm text-accent-red">{actionError}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialog("detail")}>Cancelar</Button>
            <Button variant={action === "desactivar" ? "danger" : "primary"} isLoading={busy}
              onClick={() => void confirmAction()}>Confirmar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
