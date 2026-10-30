'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { FormError } from '@/components/ui/FormError';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { solicitudes, solicitudMessage } from '@/lib/api/solicitudes';
import type { PublicCourse } from '@/types/publicCourse';
import type { SolicitudSession } from '@/types/solicitud';
import { DataStep } from './DataStep';
import { ConsentStep } from './ConsentStep';
import { CodeStep } from './CodeStep';
import { Toast } from './Toast';
import styles from './inscripcion.module.css';

export function InscripcionFlow({ initialCourseId = '' }: { initialCourseId?: string }) {
 const [courses,setCourses]=useState<PublicCourse[]>([]);
 const [courseId,setCourseId]=useState(initialCourseId);
 const [correo,setCorreo]=useState('');
 const [step,setStep]=useState<'correo'|'codigo'|'consentimiento'|'datos'|'documentos'>('correo');
 const [session,setSession]=useState<SolicitudSession|null>(null);
 const [loading,setLoading]=useState(true), [busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[retry,setRetry]=useState(0);
 const heading=useRef<HTMLHeadingElement>(null),sending=useRef(false);
 useEffect(() => {
  let alive=true;
  solicitudes.courses().then(rows => { if(alive){ setCourses(rows);setLoading(false); } })
   .catch(e => {if(alive){setError(solicitudMessage(e));setLoading(false);}});
  return () => {alive=false;};
 },[retry]);
 useEffect(() => {heading.current?.focus();},[step]);
 async function send(event: React.FormEvent) {
  event.preventDefault(); if(sending.current)return;
  if(!courses.some(c => c.id===courseId)){setError('Selecciona un curso disponible para continuar.');return;}
  sending.current=true;setBusy(true);setError('');
  try {await solicitudes.sendCode(correo.trim(),courseId);setStep('codigo');setMessage('Código enviado. Revisa tu correo.');}
  catch(e){setError(solicitudMessage(e));} finally{sending.current=false;setBusy(false);}
 }
 return <main className={styles.page}><div className={styles.flow}>
  <div className={styles.actions}><Link href="/">Volver al inicio</Link><ThemeToggle/></div>
  <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold text-text-primary">Solicitar inscripción</h1>
  <Toast message={message} onDismiss={() => setMessage('')}/>
  <FormError>{error}</FormError>
  {loading ? <p role="status">Cargando cursos…</p> : courses.length===0 ? <Card><p>No pudimos cargar los cursos.</p><Button onClick={() => {setLoading(true);setError('');setRetry(retry+1);}}>Reintentar</Button></Card> :
   <Card title={step==='correo'?'1. Curso y correo':step==='codigo'?'2. Verifica tu correo':step==='consentimiento'?'3. Consentimiento':step==='datos'?'4. Datos personales':'5. Documentos'}>
   {step==='correo' ? <form onSubmit={send} className={styles.form}>
    <Select label="Curso" value={courseId} onChange={e => setCourseId(e.target.value)} required>
     <option value="">Selecciona un curso</option>{courses.map(c => <option key={c.id} value={c.id}>Tipo {c.tipo} — {c.nombre}</option>)}
    </Select>
    <Input label="Correo electrónico" type="email" autoComplete="email" value={correo} onChange={e => setCorreo(e.target.value)} required/>
    <p className="text-sm text-text-secondary">Usaremos este correo para verificar tu solicitud y enviarte la respuesta.</p>
    <Button type="submit" isLoading={busy}>Enviar código</Button>
   </form> : step==='codigo' ? <CodeStep correo={correo} courseId={courseId} onNotice={setMessage} onBack={()=>{setStep('correo');setError('');}} onVerified={s=>{setSession(s);setStep('consentimiento');setMessage('Correo verificado.');}}/> : session && step==='consentimiento' ? <ConsentStep session={session} onAccepted={()=>{setStep('datos');setMessage('Consentimiento registrado.');}}/> : session && step==='datos' ? <DataStep session={session} onSaved={s=>{setSession(s);setStep('documentos');setMessage('Datos guardados.');}}/> : <p>Puedes subir los documentos que tengas.</p>}
   </Card>}
  <Link href="/login">Iniciar sesión</Link>
 </div></main>;
}
