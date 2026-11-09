"use client";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { FormError } from "@/components/ui/FormError";
import { LearningProgress } from "@/components/learning/LearningProgress";
import { AdminEmpty, ContentBanner } from "./AdminContentUI";
import styles from "./admin-content.module.css";
export function ContentLoad({
  loading,
  error,
  retry,
  empty,
  children,
}: {
  loading: boolean;
  error: string | null;
  retry: () => void;
  empty?: boolean;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div role="status" className={styles.loading} aria-busy="true">
        <span className="sr-only">Cargando contenido…</span>
        <div aria-hidden="true">
          <div className={`${styles.skeleton} !h-7 w-1/3`} />
          <div className="my-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((key) => (
              <div key={key} className={`${styles.skeleton} !h-24`} />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
            <div className={`${styles.skeleton} !h-72`} />
            <div className={`${styles.skeleton} !h-72`} />
          </div>
        </div>
      </div>
    );
  if (error)
    return (
      <div className={styles.surface}>
        <FormError>{error}</FormError>
        <Button variant="secondary" onClick={retry}>
          Reintentar
        </Button>
      </div>
    );
  if (empty)
    return (
      <AdminEmpty title="Aún no hay datos para esta selección">
        Cuando haya contenido o actividad, aparecerá aquí. Puedes probar otra selección.
      </AdminEmpty>
    );
  return <>{children}</>;
}
export function ContentConfirm({
  title,
  description,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!busy) onClose();
      }}
      title={<span className="[overflow-wrap:anywhere]">{title}</span>}
      className={styles.dialog}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (confirmation === "ELIMINAR" && !busy) onConfirm();
        }}
      >
        <p>{description}</p>
        <ContentBanner>
          Las reglas son permanentes. Un elemento con reglas, progreso o intentos no se puede
          quitar: despublica su contenido para retirarlo de la vista del alumno.
        </ContentBanner>
        <Input
          label="Escribe ELIMINAR para confirmar"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          disabled={busy}
          required
        />
        <FormError>{error}</FormError>
        <div className={styles.formFooter}>
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={confirmation !== "ELIMINAR"}
            isLoading={busy}
          >
            Eliminar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function ContentProgressBar(props: { value: number; complete: boolean; label: string }) {
  return <LearningProgress {...props} />;
}
export const tableClass =
  "w-full min-w-[40rem] text-left text-sm [&_th]:p-3 [&_th]:font-semibold [&_td]:p-3 [&_td]:align-top [&_tr]:border-b [&_tr]:border-border";
