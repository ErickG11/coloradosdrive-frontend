'use client';
import { useRef,useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormError } from '@/components/ui/FormError';
import { solicitudes,solicitudMessage } from '@/lib/api/solicitudes';
import type { SolicitudSession } from '@/types/solicitud';
import styles from './inscripcion.module.css';
export function CodeStep({correo,courseId,onVerified,onBack,onNotice}:{correo:string;courseId:string;onVerified:(s:SolicitudSession)=>void;onBack:()=>void;onNotice:(message:string)=>void}) {
 const [code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false);
 async function act(resend:boolean) {
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try {
   if(resend){await solicitudes.sendCode(correo,courseId);setCode('');onNotice('Código reenviado. Usa el último que recibiste.');}
   else {const session=await solicitudes.confirmCode(correo,code);onVerified(session);}
  }catch(e){setError(solicitudMessage(e));}finally{lock.current=false;setBusy(false);}
 }
 return <form className={styles.form} onSubmit={e=>{e.preventDefault();void act(false);}}>
  <p>Ingresa el código enviado a {correo}.</p><p id="code-help" className="text-sm text-text-secondary">Tiene 6 dígitos y vence en 15 minutos. Puedes pegarlo aquí.</p>
  <Input label="Código de verificación" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required aria-describedby="code-help" error={error||undefined}/>
  <Button type="submit" isLoading={busy} disabled={code.length!==6}>Verificar código</Button>
  <div className={styles.actions}><Button type="button" variant="secondary" disabled={busy} onClick={()=>void act(true)}>Reenviar código</Button><Button type="button" variant="ghost" disabled={busy} onClick={onBack}>Cambiar correo o curso</Button></div>
  <FormError>{error.includes('aprobada') ? 'Puedes iniciar sesión desde el enlace de esta página o contactar a la escuela.' : ''}</FormError>
 </form>;
}
