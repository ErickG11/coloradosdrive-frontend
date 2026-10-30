'use client';
import {useRef,useState} from 'react';
import {Input} from '@/components/ui/Input';
import {Button} from '@/components/ui/Button';
import {FormError} from '@/components/ui/FormError';
import {validStudentCedula} from '@/lib/api/studentProfile';
import {ApiError} from '@/lib/api/errors';
import {solicitudes,solicitudMessage} from '@/lib/api/solicitudes';
import type {SolicitudSession} from '@/types/solicitud';
import {applicantAge} from './applicantValidation';
import styles from './inscripcion.module.css';
export function DataStep({session,onSaved}:{session:SolicitudSession;onSaved:(s:SolicitudSession)=>void}){
 const [values,setValues]=useState({cedula:'',nombreCompleto:'',telefono:'',fechaNacimiento:'',representanteNombre:'',representanteCedula:''});
 const [accept,setAccept]=useState(false),[errors,setErrors]=useState<Record<string,string>>({}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false),form=useRef<HTMLFormElement>(null);
 const age=applicantAge(values.fechaNacimiento),minor=age>=15&&age<18;
 const birthError=values.fechaNacimiento&&(!Number.isFinite(age)||age<15)?'Debes tener al menos 15 años. Revisa tu fecha de nacimiento.':errors.fechaNacimiento;
 function field(name:keyof typeof values,label:string,type='text'){
  return <Input name={name} label={label} type={type} value={values[name]} onChange={e=>setValues({...values,[name]:e.target.value})} error={name==='fechaNacimiento'?birthError||undefined:errors[name]} autoComplete={name==='nombreCompleto'?'name':name==='telefono'?'tel':name==='fechaNacimiento'?'bday':'off'} maxLength={name.toLowerCase().includes('cedula')?10:name==='telefono'?20:200} inputMode={name.toLowerCase().includes('cedula')?'numeric':undefined}/>;
 }
 async function save(event:React.FormEvent){
  event.preventDefault();if(lock.current)return;const next:Record<string,string>={};
  if(!validStudentCedula(values.cedula))next.cedula='Ingresa una cédula ecuatoriana válida.';
  if(!values.nombreCompleto.trim())next.nombreCompleto='Ingresa tu nombre completo.';
  if(!Number.isFinite(age)||age<15)next.fechaNacimiento='Debes tener al menos 15 años. Revisa tu fecha de nacimiento.';
  if(minor){if(!values.representanteNombre.trim())next.representanteNombre='Ingresa el nombre del representante.';if(!validStudentCedula(values.representanteCedula))next.representanteCedula='Ingresa una cédula ecuatoriana válida.';if(!accept)next.representanteAcepta='Se requiere autorización del representante legal.';}
  setErrors(next);setError('');if(Object.keys(next).length){const el=form.current?.elements.namedItem(Object.keys(next)[0]);if(el instanceof HTMLElement)el.focus();return;}
  lock.current=true;setBusy(true);
  try{const result=await solicitudes.saveData(session,{cedula:values.cedula,nombreCompleto:values.nombreCompleto.trim(),fechaNacimiento:values.fechaNacimiento,...(values.telefono.trim()?{telefono:values.telefono.trim()}:{}),...(minor?{representante:{nombre:values.representanteNombre.trim(),cedula:values.representanteCedula,acepta:true as const}}:{})});onSaved(result);}
  catch(e){if(e instanceof ApiError&&e.code==='EDAD_MINIMA')setErrors({fechaNacimiento:e.message});else if(e instanceof ApiError&&e.code==='REPRESENTANTE_REQUERIDO')setErrors({representanteCedula:e.message});else setError(solicitudMessage(e));}finally{lock.current=false;setBusy(false);}
 }
 return <form ref={form} className={styles.form} onSubmit={save} noValidate>
  <FormError>{error}</FormError>{field('cedula','Cédula')}{field('nombreCompleto','Nombre completo')}{field('telefono','Teléfono (opcional)','tel')}{field('fechaNacimiento','Fecha de nacimiento','date')}
  {minor?<fieldset className={styles.form}><legend className="font-semibold">Representante legal</legend><p className="text-status-warning">Autorización para postulantes de 15 a 17 años — pendiente de revisión legal.</p>
   {field('representanteNombre','Nombre del representante')}{field('representanteCedula','Cédula del representante')}
   <label className={styles.checkbox}><input name="representanteAcepta" type="checkbox" checked={accept} onChange={e=>setAccept(e.target.checked)} aria-invalid={Boolean(errors.representanteAcepta)} aria-describedby={errors.representanteAcepta?'rep-error':undefined}/>Cuento con la autorización de mi representante legal para esta solicitud y el tratamiento de los datos.</label>
   <FormError id="rep-error">{errors.representanteAcepta}</FormError>
  </fieldset>:null}
  <Button type="submit" isLoading={busy}>Guardar datos y continuar</Button>
 </form>;
}
