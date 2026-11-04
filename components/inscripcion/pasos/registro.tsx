import type { ComponentType } from "react";

import { PasoDatos } from "./PasoDatos";
import { PasoEstudios } from "./PasoEstudios";
import { PasoRevisar } from "./PasoRevisar";
import { PantallasEstado } from "./PantallasEstado";
import type { PasoId, PasoProps } from "./tipos";

// Pasos 4 a 7 del wizard. Sus componentes exigen un progreso ya cargado; el contenedor lo
// entrega como null solo mientras lo recupera, y en ese lapso se muestra el marcador neutro.
type PropsPaso = Omit<PasoProps, "progreso" | "irAPaso"> & {
  progreso: NonNullable<PasoProps["progreso"]>;
  irAPaso: (paso: number) => void;
};

function conProgreso(Paso: ComponentType<PropsPaso>): ComponentType<PasoProps> {
  function PasoConProgreso({ progreso, irAPaso, ...resto }: PasoProps) {
    if (!progreso) return <PasoPendiente />;
    const ir = (paso: number) => {
      if (Number.isInteger(paso) && paso >= 0 && paso <= 7) irAPaso(paso as PasoId);
    };
    return <Paso progreso={progreso} irAPaso={ir} {...resto} />;
  }
  return PasoConProgreso;
}

export const PASOS_EXTERNOS: Partial<Record<PasoId, ComponentType<PasoProps>>> = {
  4: conProgreso(PasoDatos),
  5: conProgreso(PasoEstudios),
  6: conProgreso(PasoRevisar),
  7: conProgreso(PantallasEstado),
};

export function PasoPendiente() {
  return (
    <p role="status">
      Este paso todavía no está disponible. Escríbenos por WhatsApp y te ayudamos con tu
      inscripción.
    </p>
  );
}
