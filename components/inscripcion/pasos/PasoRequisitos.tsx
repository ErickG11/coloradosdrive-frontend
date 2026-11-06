"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
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
  const cursoRef = useRef<HTMLSelectElement>(null);

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
      <Select
        ref={cursoRef}
        label="Curso"
        value={courseId}
        onChange={(e) => {
          onCourseChange(e.target.value);
          setMarcadas({ edad: false, estudios: false, documentos: false });
          setErrorCurso("");
          setIncumplidas([]);
        }}
        error={errorCurso || undefined}
        required
      >
        <option value="">Selecciona un curso</option>
        {config.cursos.map((item) => (
          <option key={item.id} value={item.id}>
            Tipo {item.tipo} — {item.nombre}
          </option>
        ))}
      </Select>

      <fieldset className="grid gap-4 border-0 p-0">
        <legend className="sr-only">Confirma que cumples los requisitos</legend>
        {(["edad", "estudios", "documentos"] as const).map((casilla) => (
          <div key={casilla} className={styles.requirement}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={marcadas[casilla]}
                aria-invalid={incumplidas.includes(casilla)}
                aria-describedby={
                  incumplidas.includes(casilla) ? `requisito-${casilla}` : undefined
                }
                onChange={(e) => alternar(casilla, e.target.checked)}
              />
              {casilla === "edad"
                ? `Edad mínima: ${curso?.edadMinima ?? "—"} años cumplidos`
                : casilla === "estudios"
                  ? "Estudios mínimos: décimo año aprobado"
                  : "Puedo llevar mis documentos originales a la escuela"}
            </label>
            {casilla === "documentos" ? (
              <div className="pl-8 text-sm text-text-secondary">
                <p className="font-medium">Documentos para llevar a la escuela</p>
                <ul className="list-disc pl-5">
                  {config.documentosFisicos.map((documento) => (
                    <li key={documento.tipo}>{documento.label}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {incumplidas.includes(casilla) ? (
              <p id={`requisito-${casilla}`} role="alert" className="text-sm text-accent-red">
                Confirma este requisito para continuar.
              </p>
            ) : null}
          </div>
        ))}
      </fieldset>

      {incumplidas.length > 0 ? (
        <div
          ref={avisoRef}
          tabIndex={-1}
          role="alert"
          className={`${styles.notice} ${styles.noticeError}`}
        >
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

      <div className={styles.actions}>
        <Button type="submit">Continuar</Button>
      </div>
    </form>
  );
}
