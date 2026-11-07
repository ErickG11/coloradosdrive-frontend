"use client";
import type { KeyboardEvent } from "react";
import type { TabSolicitudes } from "@/types/inscripcion";
import { PESTANAS } from "./catalogo";
import styles from "./solicitudes.module.css";

export const ID_PANEL_SOLICITUDES = "solicitudes-panel";
const idTab = (id: TabSolicitudes) => `solicitudes-tab-${id}`;

// Pestañas con patrón WAI-ARIA: flechas, Inicio y Fin mueven la selección; solo la activa
// entra en el orden de tabulación.
export function SolicitudesTabs({
  activa,
  conteos,
  onSelect,
}: {
  activa: TabSolicitudes;
  conteos: Partial<Record<TabSolicitudes, number>>;
  onSelect: (tab: TabSolicitudes) => void;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const actual = PESTANAS.findIndex((tab) => tab.id === activa);
    let destino = actual;
    if (event.key === "ArrowRight") destino = (actual + 1) % PESTANAS.length;
    else if (event.key === "ArrowLeft") destino = (actual - 1 + PESTANAS.length) % PESTANAS.length;
    else if (event.key === "Home") destino = 0;
    else if (event.key === "End") destino = PESTANAS.length - 1;
    else return;
    event.preventDefault();
    const tab = PESTANAS[destino];
    onSelect(tab.id);
    document.getElementById(idTab(tab.id))?.focus();
  }
  return (
    <div
      role="tablist"
      aria-label="Estado de las solicitudes"
      className={styles.tabs}
      onKeyDown={onKeyDown}
    >
      {PESTANAS.map((tab) => {
        const seleccionada = tab.id === activa;
        const conteo = conteos[tab.id];
        return (
          <button
            key={tab.id}
            id={idTab(tab.id)}
            type="button"
            role="tab"
            aria-selected={seleccionada}
            aria-controls={ID_PANEL_SOLICITUDES}
            tabIndex={seleccionada ? 0 : -1}
            className={styles.tab}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
            {conteo !== undefined && conteo > 0 ? (
              <span className={styles.tabCount}>
                <span aria-hidden="true">{conteo > 99 ? "99+" : conteo}</span>
                <span className="sr-only">{`, ${conteo}`}</span>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export const idDeTab = idTab;
