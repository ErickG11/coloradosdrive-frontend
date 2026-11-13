"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { EnrollmentCheckbox } from "../EnrollmentCheckbox";
import { Button } from "@/components/ui/Button";
import { EnrollmentIcon } from "../EnrollmentVisual";
import type { InscripcionConfig } from "@/types/inscripcion";

import { ContactoWhatsApp } from "../ContactoWhatsApp";
import styles from "../wizard.module.css";

interface PasoRequisitosProps {
  config: InscripcionConfig;
  courseId: string;
  onCourseChange: (courseId: string) => void;
  onContinuar: () => void;
}

type Casilla = "edad" | "estudios" | "documentos";

export function PasoRequisitos({
  config,
  courseId,
  onCourseChange,
  onContinuar,
}: PasoRequisitosProps) {
  const [marcadas, setMarcadas] = useState<Record<Casilla, boolean>>({
    edad: false,
    estudios: false,
    documentos: false,
  });
  const [errorCurso, setErrorCurso] = useState("");
  const [incumplidas, setIncumplidas] = useState<Casilla[]>([]);
  const avisoRef = useRef<HTMLDivElement>(null);
  const cursoRef = useRef<HTMLInputElement>(null);

  const curso = config.cursos.find((item) => item.id === courseId);

  // El aviso de requisitos incumplidos recibe el foco para que se anuncie y se vea.
  useEffect(() => {
    if (incumplidas.length > 0) avisoRef.current?.focus();
  }, [incumplidas]);

  function alternar(casilla: Casilla, valor: boolean) {
    setMarcadas((previas) => ({ ...previas, [casilla]: valor }));
    setIncumplidas((previas) => previas.filter((pendiente) => pendiente !== casilla));
  }

  function continuar(event: FormEvent) {
    event.preventDefault();
    if (!curso) {
      setErrorCurso("Selecciona el curso al que quieres inscribirte.");
      cursoRef.current?.focus();
      return;
    }
    setErrorCurso("");
    const faltan = (["edad", "estudios", "documentos"] as const).filter((c) => !marcadas[c]);
    setIncumplidas(faltan);
    if (faltan.length === 0) onContinuar();
  }

  return (
    <form className={styles.form} onSubmit={continuar} noValidate>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">Elige tu curso</legend>
        <div className={styles.courseChoices}>
          {config.cursos.map((item, index) => (
            <label key={item.id} className={styles.courseChoice}>
              <span className="flex items-center justify-between gap-2">
                <span className="h-9 w-9 text-brand-ink">
                  <EnrollmentIcon name={item.tipo === "A" ? "moto" : "car"} />
                </span>
                <input
                  ref={index === 0 ? cursoRef : undefined}
                  type="radio"
                  name="curso"
                  value={item.id}
                  checked={courseId === item.id}
                  required
                  onChange={() => {
                    onCourseChange(item.id);
                    setMarcadas({ edad: false, estudios: false, documentos: false });
                    setErrorCurso("");
                    setIncumplidas([]);
                  }}
                />
              </span>
              <strong>{item.tipo === "A" ? "Motocicletas" : "Vehículos livianos"}</strong>
              <span className="text-sm">Tipo {item.tipo}</span>
              <p>{item.edadMinima} años cumplidos · Décimo año aprobado</p>
            </label>
          ))}
        </div>
        {errorCurso ? (
          <p role="alert" className="mt-2 text-sm text-status-error">
            {errorCurso}
          </p>
        ) : null}
      </fieldset>

      <fieldset className={styles.requirementList}>
        <legend className="sr-only">Confirma que cumples los requisitos</legend>
        {(["edad", "estudios", "documentos"] as const).map((casilla) => (
          <div key={casilla} className={styles.requirement}>
            <label className={styles.requirementLabel}>
              <EnrollmentCheckbox
                checked={marcadas[casilla]}
                aria-invalid={incumplidas.includes(casilla)}
                aria-describedby={
                  incumplidas.includes(casilla) ? `requisito-${casilla}` : undefined
                }
                onChange={(e) => alternar(casilla, e.target.checked)}
              />
              <span className={styles.requirementCopy}>
                <span className="font-medium">
                  {casilla === "edad"
                    ? curso
                      ? `Edad mínima: ${curso.edadMinima} años cumplidos`
                      : "Elige un curso para consultar la edad mínima"
                    : casilla === "estudios"
                      ? "Estudios mínimos: décimo año aprobado"
                      : "Puedo llevar mis documentos originales a la escuela"}
                </span>
                {casilla === "documentos" ? (
                  <span role="list" className={styles.requirementDocuments}>
                    {config.documentosFisicos.map((documento) => (
                      <span role="listitem" key={documento.tipo}>
                        {documento.label}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
            </label>
            {incumplidas.includes(casilla) ? (
              <p id={`requisito-${casilla}`} role="alert" className="text-sm text-accent-red">
                Confirma este requisito para continuar.
              </p>
            ) : null}
          </div>
        ))}
      </fieldset>

      {incumplidas.length > 0 ? (
        <div ref={avisoRef} tabIndex={-1} role="alert" className={styles.noticeError}>
          <p>Por ahora no puedes continuar con la inscripción en línea:</p>
          <ul>
            {incumplidas.includes("edad") ? (
              <li>
                {curso
                  ? `La edad mínima para este curso es de ${curso.edadMinima} años. Podrás inscribirte cuando la cumplas.`
                  : "Debes cumplir la edad mínima del curso."}
              </li>
            ) : null}
            {incumplidas.includes("estudios") ? (
              <li>Necesitas haber aprobado al menos décimo año para inscribirte.</li>
            ) : null}
            {incumplidas.includes("documentos") ? (
              <li>
                Los documentos originales se presentan en la escuela. Si tienes dudas, escríbenos.
              </li>
            ) : null}
          </ul>
          <p>Si crees que se trata de un error, escríbenos por WhatsApp y te ayudamos.</p>
          <ContactoWhatsApp />
        </div>
      ) : null}

      <div data-flow-actions className={styles.actions}>
        <Button type="submit">Continuar</Button>
      </div>
    </form>
  );
}
