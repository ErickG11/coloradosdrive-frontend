const paths = {
  student: "M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  existing:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  car: "m3 12 2-7h14l2 7M3 12h18v7h-3v-2H6v2H3v-7Zm3 2h2m8 0h2",
  motorcycle:
    "M7 17a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm16 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 17l6-9 4 9H3m6-9h7l3 9m-7-13h4l1 4",
  calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z",
  document: "M14 2H6v20h12V6l-4-4Zm0 0v5h5M9 12h6m-6 4h4",
  check: "m5 12 4 4L19 6",
  money: "M12 2v20m5-16H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6",
};
export function WizardIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="-2 0 28 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export const STEP_LABELS = [
  "Estudiante",
  "Curso",
  "Prácticas",
  "Documentos y pago",
  "Confirmar",
] as const;
