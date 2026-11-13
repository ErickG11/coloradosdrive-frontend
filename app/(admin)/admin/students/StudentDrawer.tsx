"use client";
import { StudentDetail } from "./StudentDetail";
export type StudentView = "ficha" | "matriculas" | "documentos" | "editar";
export function studentView(value: string | null): StudentView {
  return value === "matriculas" || value === "documentos" || value === "editar" ? value : "ficha";
}
export function StudentDrawer({
  id,
  view = "ficha",
  onClose,
  onChanged,
}: {
  id: string | null;
  view?: StudentView;
  onClose: () => void;
  onChanged: () => void;
}) {
  return id ? (
    <StudentDetail key={id} id={id} embedded view={view} onClose={onClose} onChanged={onChanged} />
  ) : null;
}
