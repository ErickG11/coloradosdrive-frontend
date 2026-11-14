import { cedulaError } from "./pasos/validadoresDatos";
export type DocumentType = "cedula" | "pasaporte" | "otro";
export const documentLabel = (type: string) =>
  ({ cedula: "Cédula", pasaporte: "Pasaporte", otro: "Otro documento" })[type] ?? "Documento";
export function documentError(type: string, number: string): string {
  return type === "cedula"
    ? cedulaError(number)
    : /^[A-Z0-9][A-Z0-9-]{2,29}$/.test(number.trim().toUpperCase())
      ? ""
      : "Ingresa de 3 a 30 letras, números o guion, sin espacios interiores.";
}
