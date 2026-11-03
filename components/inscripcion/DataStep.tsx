"use client";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import {normalizeApplicantName,normalizeApplicantPhone,validateApplicantValues} from "./validation";
import { ApiError } from "@/lib/api/errors";
import { solicitudes, solicitudMessage } from "@/lib/api/solicitudes";
import type { SolicitudSession } from "@/types/solicitud";
import { applicantAge } from "./applicantValidation";
import styles from "./inscripcion.module.css";
export function DataStep({
  session,
  onSaved,
}: {
  session: SolicitudSession;
  onSaved: (s: SolicitudSession) => void;
}) {
  const [values, setValues] = useState({
    cedula: "",
    nombreCompleto: "",
    telefono: "",
    fechaNacimiento: "",
    representanteNombre: "",
    representanteCedula: "",
  });
  const [accept, setAccept] = useState(false),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    form = useRef<HTMLFormElement>(null);
  const age = applicantAge(values.fechaNacimiento),
    minor = age >= 15 && age < 18;
  const birthError=values.fechaNacimiento?validateApplicantValues(values,accept).fechaNacimiento:errors.fechaNacimiento;
  function field(name: keyof typeof values, label: string, type = "text") {
    return (
      <Input
        name={name}
        label={label}
        type={type}
        value={values[name]}
        onChange={(e) => {const next={...values,[name]:e.target.value};setValues(next);if(name.toLowerCase().includes('cedula'))setErrors(old=>({...old,[name]:validateApplicantValues(next,accept)[name]??''}));}}
        onBlur={()=>setErrors(old=>({...old,[name]:validateApplicantValues(values,accept)[name]??''}))}
        error={name === "fechaNacimiento" ? birthError || undefined : errors[name]}
        autoComplete={
          name === "nombreCompleto"
            ? "name"
            : name === "telefono"
              ? "tel"
              : name === "fechaNacimiento"
                ? "bday"
                : "off"
        }
        maxLength={name.toLowerCase().includes("cedula") ? 10 : name === "telefono" ? 14 : 100}
        aria-describedby={name==="telefono"?"phone-help":undefined}
        inputMode={name.toLowerCase().includes("cedula") ? "numeric" : undefined}
      />
    );
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const next=validateApplicantValues(values,accept);
    setErrors(next);
    setError("");
    if (Object.keys(next).length) {
      const el = form.current?.elements.namedItem(Object.keys(next)[0]);
      if (el instanceof HTMLElement) el.focus();
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const result = await solicitudes.saveData(session, {
        cedula: values.cedula,
        nombreCompleto: normalizeApplicantName(values.nombreCompleto),
        fechaNacimiento: values.fechaNacimiento,
        ...(values.telefono.trim() ? { telefono: normalizeApplicantPhone(values.telefono) } : {}),
        ...(minor
          ? {
              representante: {
                nombre: normalizeApplicantName(values.representanteNombre),
                cedula: values.representanteCedula,
                acepta: true as const,
              },
            }
          : {}),
      });
      onSaved(result);
    } catch (e) {
      if(e instanceof ApiError){
        const field=e.field ?? (['EDAD_MINIMA','EDAD_MAXIMA','FECHA_INVALIDA'].includes(e.code??'')?'fechaNacimiento':e.code==='CEDULA_YA_REGISTRADA'?'cedula':e.code==='REPRESENTANTE_REQUERIDO'?'representanteCedula':undefined);
        if(field){setErrors({[field]:e.message});const control=form.current?.elements.namedItem(field);if(control instanceof HTMLElement)control.focus();}else setError(solicitudMessage(e));
      }else setError(solicitudMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form ref={form} className={styles.form} onSubmit={save} noValidate>
      <FormError>{error}</FormError>
      <div className={styles.fieldGrid}>
        {field("cedula", "Cédula")}
        {field("nombreCompleto", "Nombre completo")}
        {field("telefono", "Teléfono (opcional)", "tel")}
        {field("fechaNacimiento", "Fecha de nacimiento", "date")}
      </div>
      <p id="phone-help" className="text-sm text-text-secondary">Teléfono: 0991234567, 022345678 o +593991234567.</p>
      {minor ? (
        <fieldset className={styles.form}>
          <legend className="font-semibold">Representante legal</legend>
          <p className="text-status-warning">
            Autorización para postulantes de 15 a 17 años — pendiente de revisión legal.
          </p>
          <div className={styles.fieldGrid}>
            {field("representanteNombre", "Nombre del representante")}
            {field("representanteCedula", "Cédula del representante")}
          </div>
          <label className={styles.checkbox}>
            <input
              name="representanteAcepta"
              type="checkbox"
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
              aria-invalid={Boolean(errors.representanteAcepta)}
              aria-describedby={errors.representanteAcepta ? "rep-error" : undefined}
            />
            Cuento con la autorización de mi representante legal para esta solicitud y el
            tratamiento de los datos.
          </label>
          <FormError id="rep-error">{errors.representanteAcepta}</FormError>
        </fieldset>
      ) : null}
      <div className={styles.stepActions}>
        <Button type="submit" isLoading={busy}>
          Guardar datos y continuar
        </Button>
      </div>
    </form>
  );
}
