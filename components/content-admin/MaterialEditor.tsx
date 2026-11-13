"use client";
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { contentApi } from "@/lib/api/content";
import { ContentInputError, contentErrorMessage } from "@/lib/utils/content";
import type { CourseMaterial } from "@/types/content";
import { useContentMutation } from "./useContentResource";
import { useRequiredFields } from "./useRequiredFields";
import styles from "./admin-content.module.css";
export function MaterialEditor({
  material,
  placement,
  onClose,
  onSaved,
}: {
  material: CourseMaterial | null;
  placement?: { subjectId: string; order: number };
  onClose: () => void;
  onSaved: (warning?: string) => void;
}) {
  const [kind, setKind] = useState<CourseMaterial["kind"]>(material?.kind ?? "archivo");
  const [title, setTitle] = useState(material?.title ?? "");
  const [description, setDescription] = useState(material?.description ?? "");
  const [url, setUrl] = useState(material?.url ?? "");
  const [body, setBody] = useState(material?.body ?? "");
  const [file, setFile] = useState<File | null>(null);
  const action = useContentMutation();
  const required = useRequiredFields();
  const needsFile = !material && kind === "archivo";
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !required.check([
        { id: "material-title", empty: title.trim() === "" },
        ...(needsFile ? [{ id: "material-file", empty: !file }] : []),
        ...(kind === "enlace" ? [{ id: "material-url", empty: url.trim() === "" }] : []),
        ...(kind === "texto" ? [{ id: "material-body", empty: body.trim() === "" }] : []),
      ])
    )
      return;
    const result = await action.run(
      async () => {
        if (!material && kind === "archivo") {
          if (
            !file ||
            file.size === 0 ||
            file.size > 10 * 1024 * 1024 ||
            !/[.](pdf|png|jpe?g)$/i.test(file.name)
          )
            throw new ContentInputError(
              "Selecciona un PDF, PNG o JPG de hasta 10 MB. El servidor verificará su firma real.",
            );
          const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
          const pdf = String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
          const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
            (value, index) => bytes[index] === value,
          );
          const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
          if (!pdf && !png && !jpg)
            throw new ContentInputError(
              "La firma del archivo no corresponde a un PDF, PNG o JPG válido.",
            );
        }
        if (kind === "enlace") {
          let parsed: URL;
          try {
            parsed = new URL(url);
          } catch {
            throw new ContentInputError("Escribe un enlace HTTPS válido.");
          }
          if (parsed.protocol !== "https:")
            throw new ContentInputError("El enlace debe empezar por https://.");
        }
        if (kind === "texto" && (body.length < 1 || body.length > 20000))
          throw new ContentInputError("El texto debe tener entre 1 y 20 000 caracteres.");
        const data = material
          ? await contentApi.saveMaterial(material.id, {
              title,
              description,
              ...(kind === "enlace" ? { url } : kind === "texto" ? { body } : {}),
            })
          : kind === "archivo"
            ? await contentApi.upload(file!, title, description)
            : await contentApi.saveMaterial(null, {
                title,
                description,
                kind,
                ...(kind === "enlace" ? { url } : { body }),
              });
        let warning = "";
        if (!material && placement)
          try {
            await contentApi.place({
              subject_id: placement.subjectId,
              kind: "material",
              material_id: data.id,
              order_index: placement.order,
            });
          } catch (error: unknown) {
            warning = `El material se creó, pero no pudo colocarse: ${contentErrorMessage(error)} Está en Materiales sin colocar; reintenta desde allí sin volver a subirlo.`;
          }
        return { warning };
      },
      (value) =>
        material
          ? "Material actualizado."
          : value.warning
            ? "Material creado sin colocar."
            : "Material creado y colocado como borrador.",
    );
    if (result.ok) onSaved(result.value.warning);
  }
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!action.busy) onClose();
      }}
      title={material ? "Editar material" : "Agregar material"}
      className={`${styles.dialog} max-w-2xl`}
    >
      <p className={styles.dialogDescription}>
        Prepara un archivo, enlace o texto para el temario. Publicarlo y habilitarlo son pasos
        independientes.
      </p>
      <form className={`space-y-4 ${styles.requiredFields}`} noValidate onSubmit={submit}>
        <fieldset disabled={action.busy} className="space-y-4">
          <Input
            id="material-title"
            label="Título"
            required
            aria-required="true"
            error={required.errors["material-title"]}
            maxLength={120}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              required.clear("material-title");
            }}
          />
          <Textarea
            label="Descripción"
            maxLength={20000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Select
            label="Tipo de material"
            disabled={Boolean(material)}
            value={kind}
            onChange={(e) => setKind(e.target.value as CourseMaterial["kind"])}
          >
            <option value="archivo">Archivo PDF, PNG o JPG</option>
            <option value="enlace">Enlace HTTPS</option>
            <option value="texto">Texto plano</option>
          </Select>
          {kind === "archivo" ? (
            material ? (
              <p className="text-sm text-text-secondary">
                El archivo no se reemplaza. Crea otro material para subir una nueva versión.
              </p>
            ) : (
              <>
                <Input
                  label="Archivo (máximo 10 MB)"
                  type="file"
                  id="material-file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  required
                  aria-required="true"
                  error={required.errors["material-file"]}
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    required.clear("material-file");
                  }}
                />
                <p className="text-sm text-text-secondary">
                  Hasta 50 subidas por administrador y día. Las subidas fallidas después de reservar
                  cuota también pueden contar.
                </p>
              </>
            )
          ) : kind === "enlace" ? (
            <Input
              id="material-url"
              label="Enlace HTTPS"
              type="url"
              pattern="https://.*"
              required
              aria-required="true"
              error={required.errors["material-url"]}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                required.clear("material-url");
              }}
            />
          ) : (
            <>
              <Textarea
                id="material-body"
                label="Texto plano"
                rows={9}
                required
                aria-required="true"
                error={required.errors["material-body"]}
                maxLength={20000}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  required.clear("material-body");
                }}
              />
              <p className="text-sm text-text-secondary">
                {body.length}/20 000 caracteres. El contenido se muestra como texto, sin ejecutar
                HTML.
              </p>
            </>
          )}
        </fieldset>
        <FormError>{action.error}</FormError>
        <div className={styles.formFooter}>
          <Button type="button" variant="secondary" disabled={action.busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={action.busy}>
            Guardar material
          </Button>
        </div>
      </form>
    </Modal>
  );
}
