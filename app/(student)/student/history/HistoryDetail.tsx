"use client";
import Link from "next/link";
import { Button, Modal } from "@/components/ui";
import type { PendingPracticeRating } from "@/types/practiceRating";
import {
  formatDate,
  formatTime,
  hours,
  isUpcoming,
  stateOf,
  type HistoryBlock,
} from "./historyModel";
import { HistoryBadge, Instructor } from "./HistoryVisual";
import styles from "./history.module.css";

export function HistoryDetail({
  block,
  now,
  pendingRatings,
  onClose,
  onRate,
}: {
  block: HistoryBlock;
  now: number | null;
  pendingRatings: PendingPracticeRating[];
  onClose: () => void;
  onRate: (rating: PendingPracticeRating) => void;
}) {
  return (
    <Modal isOpen onClose={onClose} title="Detalle de la práctica" className={styles.detailPanel}>
      <div className={styles.detailContent}>
        <p className={styles.detailDate}>
          {formatDate(block.start, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        {block.entries.map((item) => {
          const rating = pendingRatings.find(
            (rating) =>
              rating.practiceSlotId === item.practiceSlotId &&
              Date.parse(rating.scheduledAt) === Date.parse(item.scheduledAt),
          );
          return (
            <section key={item.id} className={styles.detailHour}>
              <p className={styles.detailTime}>
                {formatTime(item.scheduledAt)}
                {item.durationMinutes !== null
                  ? ` – ${formatTime(Date.parse(item.scheduledAt) + item.durationMinutes * 60000)}`
                  : ""}
              </p>
              <HistoryBadge state={stateOf(item, now)} />
              <dl>
                <div>
                  <dt>Duración</dt>
                  <dd>
                    {item.durationMinutes !== null
                      ? `${hours(item.durationMinutes / 60)} h`
                      : "No disponible en este registro"}
                  </dd>
                </div>
                {item.instructor ? (
                  <div>
                    <dt>Instructor</dt>
                    <dd>
                      <Instructor name={item.instructor.name} />
                    </dd>
                  </div>
                ) : null}
                {item.resultado ? (
                  <div>
                    <dt>Resultado del aviso</dt>
                    <dd>
                      {item.resultado === "reprogramable"
                        ? "Reprogramable"
                        : item.resultado === "hora_perdida"
                          ? "Hora perdida, sin reposición"
                          : "Falta, sin reprogramación"}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {item.motivo ? (
                <div className={styles.reason}>
                  <h3>Motivo registrado</h3>
                  <p>{item.motivo}</p>
                </div>
              ) : null}
              {item.slotStatus === "completado" && item.attended === null ? (
                <p className={styles.secondary}>
                  La práctica terminó y su asistencia aún está por registrar.
                </p>
              ) : null}
              {item.estado === "cancelada" && item.resultado === "reprogramable" ? (
                <p className={styles.secondary}>Esta hora fue reemplazada por otro horario.</p>
              ) : null}
              {isUpcoming(item, now) ? (
                <Link href="/student/schedule" className={styles.manageLink}>
                  Gestionar en Horarios de práctica
                </Link>
              ) : null}
              {rating ? (
                <Button variant="secondary" onClick={() => onRate(rating)}>
                  Calificar
                </Button>
              ) : null}
            </section>
          );
        })}
        <p className={styles.timeNote}>Horas en hora de Ecuador.</p>
      </div>
    </Modal>
  );
}
