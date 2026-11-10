"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { QuestionImage } from "@/components/exams/QuestionImage";
import { imageFileLabel, QUESTION_IMAGE_ACCEPT } from "@/lib/utils/questionImages";
import type { QuestionImage as ImageValue } from "@/types/exam";
import type { QuestionImageDraft } from "./useQuestionImageDrafts";
import styles from "@/components/exams/question-images.module.css";

export function QuestionImageField({
  image,
  draft,
  index,
  frozen = false,
  published = false,
  disabled = false,
  saved = false,
  onChoose,
  onAlt,
  onRemove,
  onDiscard,
  onRetry,
  onReload,
  onRefresh,
}: {
  image?: ImageValue | null;
  draft?: QuestionImageDraft;
  index: number;
  frozen?: boolean;
  published?: boolean;
  disabled?: boolean;
  saved?: boolean;
  onChoose: (file: File, alt: string) => Promise<void>;
  onAlt: (alt: string) => void;
  onRemove: () => void;
  onDiscard: () => void;
  onRetry: () => Promise<void>;
  onReload: () => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<{
    kind: "replace" | "remove" | "reload";
    file?: File;
  } | null>(null);
  const [reloadError, setReloadError] = useState(false);
  const blocked = disabled || published || Boolean(draft?.busy || draft?.checking);
  const needsReload = draft?.code === "IMAGE_CONFLICT" || draft?.code === "IMAGE_NOT_FOUND";
  const imageBlocked = blocked || frozen || needsReload;
  const alt = draft?.alt ?? image?.alt ?? "";
  const preview =
    draft?.action === "remove"
      ? null
      : draft?.preview
        ? { url: draft.preview, alt }
        : image
          ? { ...image, alt }
          : null;
  function select(file?: File) {
    if (!file || imageBlocked) return;
    if (preview) setConfirm({ kind: "replace", file });
    else void onChoose(file, alt);
  }
  function browse() {
    if (input.current) {
      input.current.value = "";
      input.current.click();
    }
  }
  return (
    <section className={styles.field} aria-label={`Imagen de la pregunta ${index + 1}`}>
      <div className={styles.fieldHeading}>
        <h4>Imagen opcional</h4>
        <span className={styles.help}>PNG · JPG · WebP · hasta 3 MiB</span>
      </div>
      {published ? (
        <p className={styles.help}>Despublica para editar.</p>
      ) : frozen ? (
        <p className={styles.help}>
          El examen tiene intentos: la imagen está en solo lectura. Puedes corregir su descripción.
        </p>
      ) : (
        <p className={styles.help}>
          {saved
            ? "Los cambios de imagen se aplican al guardar el examen."
            : "La imagen queda en esta pestaña y se sube después de guardar la pregunta."}
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept={QUESTION_IMAGE_ACCEPT}
        aria-label={`Seleccionar imagen para pregunta ${index + 1}`}
        disabled={imageBlocked}
        onChange={(event) => select(event.target.files?.[0])}
      />
      {preview ? (
        <>
          <QuestionImage
            image={preview}
            index={index}
            eager
            onRetry={saved && !draft?.preview ? onRefresh : undefined}
          />
          <div className={styles.actions}>
            <Button type="button" variant="secondary" disabled={imageBlocked} onClick={browse}>
              Reemplazar imagen de la pregunta {index + 1}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={imageBlocked}
              onClick={() => setConfirm({ kind: "remove" })}
            >
              Quitar imagen de la pregunta {index + 1}
            </Button>
          </div>
        </>
      ) : (
        <div
          className={styles.drop}
          role="group"
          aria-label={`Zona de imagen de la pregunta ${index + 1}`}
          data-disabled={imageBlocked}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (!imageBlocked) select(event.dataTransfer.files[0]);
          }}
        >
          <Button type="button" variant="secondary" disabled={imageBlocked} onClick={browse}>
            Agregar imagen a la pregunta {index + 1}
          </Button>
          <p className={styles.help}>También puedes arrastrarla aquí.</p>
        </div>
      )}
      {draft?.file ? (
        <p className={styles.help}>Archivo seleccionado: {imageFileLabel(draft.file.name)}</p>
      ) : null}
      {frozen && draft?.action === "upload" ? (
        <p className={styles.help}>
          Deshaz el cambio de imagen pendiente para corregir la descripción de la imagen guardada.
        </p>
      ) : null}
      {preview ? (
        <div>
          <Input
            label={`Pregunta ${index + 1} - Descripción de la imagen (accesibilidad)`}
            value={alt}
            maxLength={300}
            disabled={blocked || needsReload || (frozen && draft?.action === "upload")}
            aria-describedby={`image-alt-help-${index}`}
            onChange={(event) => onAlt(event.target.value)}
          />
          <p className={styles.help} id={`image-alt-help-${index}`}>
            Recomendada, no obligatoria. Describe lo que se ve sin revelar la respuesta.{" "}
            {Array.from(alt).length}/300
          </p>
        </div>
      ) : null}
      {draft?.checking || draft?.busy ? (
        <p role="status" className={styles.help}>
          {draft.checking ? "Comprobando imagen…" : "Guardando imagen…"}
        </p>
      ) : null}
      {draft?.action ? (
        <div className={styles.actions}>
          <p className={styles.help}>
            {draft.action === "remove"
              ? "La imagen se quitará al guardar."
              : "Cambio de imagen o descripción pendiente de guardar."}
          </p>
          <Button type="button" variant="ghost" disabled={blocked} onClick={onDiscard}>
            Deshacer cambio de imagen {index + 1}
          </Button>
        </div>
      ) : null}
      {draft?.error ? (
        <div>
          <p role="alert" className={styles.error}>
            {draft.action
              ? `Guardado, pero ${draft.action === "alt" ? "la descripción de " : ""}la imagen de la pregunta ${index + 1} no se pudo ${draft.action === "remove" ? "quitar" : "guardar"}. `
              : ""}
            {draft.error}
          </p>
          {draft.action && saved ? (
            draft.code === "IMAGE_CONFLICT" || draft.code === "IMAGE_NOT_FOUND" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={blocked}
                onClick={() => setConfirm({ kind: "reload" })}
              >
                Recargar imagen de la pregunta {index + 1}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={blocked || (frozen && draft.action !== "alt")}
                onClick={() => void onRetry()}
              >
                Reintentar imagen pendiente {index + 1}
              </Button>
            )
          ) : null}
        </div>
      ) : null}
      <Modal
        isOpen={confirm !== null}
        onClose={() => {
          setConfirm(null);
          setReloadError(false);
        }}
        title={
          confirm?.kind === "remove"
            ? "¿Quitar esta imagen?"
            : confirm?.kind === "reload"
              ? "¿Recargar la imagen actual?"
              : "¿Reemplazar esta imagen?"
        }
      >
        <p className={styles.help}>
          {confirm?.kind === "reload"
            ? "Se descartará el cambio pendiente de esta imagen y se mostrará la versión actual del servidor. El resto del formulario se conserva."
            : "El cambio se aplicará al guardar. Puedes deshacerlo antes de enviarlo."}
        </p>
        {reloadError ? (
          <p role="alert" className={styles.error}>
            No se pudo recargar. Se conservó el cambio pendiente; inténtalo de nuevo.
          </p>
        ) : null}
        <div className={styles.confirmActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setConfirm(null);
              setReloadError(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (confirm?.kind === "reload") {
                void onReload()
                  .then(() => setConfirm(null))
                  .catch(() => setReloadError(true));
                return;
              }
              if (confirm?.kind === "remove") onRemove();
              else if (confirm?.file) void onChoose(confirm.file, alt);
              setConfirm(null);
            }}
          >
            Confirmar cambio de imagen
          </Button>
        </div>
      </Modal>
    </section>
  );
}
