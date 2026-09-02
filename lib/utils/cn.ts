type ClassValue = string | number | null | undefined | false;

// Merge minimalista de clases condicionales (sin dependencias externas).
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
