"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { questionImageError } from "@/lib/utils/questionImages";
import { ApiError } from "@/lib/api/errors";
import type { QuestionImage as ImageValue } from "@/types/exam";
import styles from "./question-images.module.css";

export function QuestionImage({
  image,
  index,
  eager = false,
  expandable = true,
  onRetry,
}: {
  image?: ImageValue | null;
  index: number;
  eager?: boolean;
  expandable?: boolean;
  onRetry?: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState({ url: "", loaded: false, failed: false, revision: 0 });
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  if (!image) return null;
  const failed = state.url === image.url && state.failed;
  const loaded = state.url === image.url && state.loaded;
  const alt = image.alt?.trim() || `Imagen de la pregunta ${index + 1}`;
  const fail = () =>
    setState((current) => ({ ...current, url: image.url, failed: true, loaded: false }));
  const markLoaded = () =>
    setState((current) =>
      current.url === image.url && current.loaded && !current.failed
        ? current
        : { ...current, url: image.url, loaded: true, failed: false },
    );
  async function retry() {
    if (!onRetry || lock.current) return;
    lock.current = true;
    setRetrying(true);
    setError(null);
    try {
      await onRetry();
      setState((current) => ({
        url: image?.url ?? "",
        failed: false,
        loaded: false,
        revision: current.revision + 1,
      }));
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.code === "ATTEMPT_EXPIRED"
          ? questionImageError(failure)
          : "No se pudo renovar la imagen. Vuelve a intentarlo.",
      );
    } finally {
      lock.current = false;
      setRetrying(false);
    }
  }
  const feedback = (
    <div className={styles.feedback} role="status">
      <p>{error ?? "No se pudo mostrar la imagen."}</p>
      {onRetry ? (
        <Button type="button" variant="secondary" isLoading={retrying} onClick={() => void retry()}>
          Reintentar imagen de la pregunta {index + 1}
        </Button>
      ) : (
        <p>La imagen no está disponible para esta vista.</p>
      )}
    </div>
  );
  const picture = (
    <>
      {!loaded && !failed ? (
        <span
          className={styles.skeleton}
          role="status"
          aria-label={`Cargando imagen de la pregunta ${index + 1}`}
        />
      ) : null}
      {/* Signed and local blob URLs are rendered in memory only; Next's public optimizer is not used. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={(node) => {
          if (node?.complete && node.naturalWidth > 0) markLoaded();
        }}
        key={`${image.url}:${state.revision}`}
        src={image.url}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        width={1600}
        height={900}
        className={styles.image}
        data-loaded={loaded}
        onLoad={markLoaded}
        onError={fail}
      />
    </>
  );
  return (
    <figure className={styles.figure} aria-label={`Imagen de la pregunta ${index + 1}`}>
      {failed ? (
        <div className={styles.frame}>{feedback}</div>
      ) : expandable ? (
        <button
          type="button"
          className={`${styles.frame} ${styles.enlarge}`}
          aria-label={`Ampliar imagen de la pregunta ${index + 1}`}
          disabled={!loaded}
          onClick={() => setExpanded(true)}
        >
          {picture}
          <span className={styles.zoomHint}>Ampliar ↗</span>
        </button>
      ) : (
        <div className={styles.frame}>{picture}</div>
      )}
      {expanded
        ? createPortal(
            <Modal
              isOpen={expanded}
              onClose={() => setExpanded(false)}
              title={`Imagen de la pregunta ${index + 1}`}
              className={styles.lightbox}
            >
              {failed ? (
                feedback
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={alt} className={styles.fullImage} onError={fail} />
                </>
              )}
            </Modal>,
            document.body,
          )
        : null}
    </figure>
  );
}
