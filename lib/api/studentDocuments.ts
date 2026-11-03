import { api } from "./client";
import { ApiError } from "./errors";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/utils/env";
import type { DocumentoTipo } from "@/types/solicitud";
export interface StudentDocument {
  tipo: DocumentoTipo;
  estado: "sin_subir" | "en_revision" | "aprobado" | "rechazado";
  motivoRechazo: string | null;
  uploadedAt: string | null;
  reviewedAt: string | null;
  obligatorio: boolean;
  exento: boolean;
  estadoFisico: string | null;
}
export interface StudentDocuments {
  documentos: StudentDocument[];
  puedeSubir: boolean;
}
export const getStudentDocuments = () => api.get<StudentDocuments>("/estudiantes/documentos");
export async function uploadStudentDocument(tipo: DocumentoTipo, file: File): Promise<void> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  const body = new FormData();
  body.append("tipo_documento", tipo);
  body.append("archivo", file);
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/estudiantes/documentos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    body,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
    throw new ApiError(data.message ?? "No se pudo subir el documento", res.status, {
      code: data.code,
    });
  }
}
