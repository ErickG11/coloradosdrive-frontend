"use client";
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { contentApi } from "@/lib/api/content";
import type { CourseSubject } from "@/types/content";
import { useContentMutation } from "./useContentResource";
import { useRequiredFields } from "./useRequiredFields";
import styles from "./admin-content.module.css";
export function SubjectEditor({
  subject,
  courseId,
  order,
  onClose,
  onSaved,
}: {
  subject: CourseSubject | null;
  courseId: string;
  order: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(subject?.title ?? "");
  const [description, setDescription] = useState(subject?.description ?? "");
  const action = useContentMutation();
  const required = useRequiredFields();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!required.check([{ id: "subject-title", empty: title.trim() === "" }])) return;
    const result = await action.run(
      () =>
        contentApi.saveSubject(subject?.id ?? null, {
          title: title.trim(),
          description,
          ...(!subject ? { course_id: courseId, order_index: order } : {}),
        }),
      subject ? "Materia actualizada." : "Materia creada como borrador.",
    );
    if (result.ok) onSaved();
  }
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!action.busy) onClose();
      }}
      title={subject ? "Editar materia" : "Nueva materia"}
      className={styles.dialog}
    >
      <p className={styles.dialogDescription}>
        Define una parada del curso. Las nuevas materias se guardan como borrador para que puedas
        prepararlas antes de publicarlas.
      </p>
      <form className={`space-y-4 ${styles.requiredFields}`} noValidate onSubmit={submit}>
        <fieldset disabled={action.busy} className="space-y-4">
          <Input
            id="subject-title"
            label="Título"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              required.clear("subject-title");
            }}
            required
            aria-required="true"
            error={required.errors["subject-title"]}
            maxLength={120}
          />
          <Textarea
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={20000}
          />
        </fieldset>
        <FormError>{action.error}</FormError>
        <div className={styles.formFooter}>
          <Button type="button" variant="secondary" disabled={action.busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={action.busy}>
            Guardar materia
          </Button>
        </div>
      </form>
    </Modal>
  );
}
