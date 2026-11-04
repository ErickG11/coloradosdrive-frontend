import type { ComponentType } from "react";

import type { PasoId, PasoProps } from "./tipos";

// Pasos que implementan otros módulos del flujo. El contenedor del wizard los toma de
// esta tabla; mientras falte uno se muestra un marcador neutro. Para conectar un paso se
// importa su componente aquí y se añade a la tabla, por ejemplo:
//   import { PasoDatos } from "./PasoDatos";
//   PASOS_EXTERNOS = { 4: PasoDatos, 5: PasoEstudios, 6: PasoRevisar, 7: PantallasEstado }
export const PASOS_EXTERNOS: Partial<Record<PasoId, ComponentType<PasoProps>>> = {};

export function PasoPendiente() {
  return (
    <p role="status">
      Este paso todavía no está disponible. Escríbenos por WhatsApp y te ayudamos con tu
      inscripción.
    </p>
  );
}
