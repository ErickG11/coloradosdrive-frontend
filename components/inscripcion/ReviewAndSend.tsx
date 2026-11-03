'use client';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/Button';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {ApiError} from '@/lib/api/errors';
import {solicitudes,solicitudMessage} from '@/lib/api/solicitudes';
import {DOCUMENTOS,type DocumentoTipo,type SolicitudProgress,type SolicitudSession,type SolicitudSubmission} from '@/types/solicitud';
import styles from './inscripcion.module.css';
export function missingDocumentsMessage(types:string[]):string {
 const cedula=types.includes('cedula'),titulo=types.includes('titulo_bachiller');
 return cedula&&titulo?'Faltan la cédula y el título de bachiller o certificado de décimo':cedula?'Falta subir la cédula':titulo?'Falta subir el título de bachiller o certificado de décimo':'';
}
export function ReviewAndSend({session,documents,onBack,onSubmitted}:{session:SolicitudSession;documents:SolicitudProgress['documentos'];onBack:(missing:DocumentoTipo[])=>void;onSubmitted:(result:SolicitudSubmission)=>void}){
 const [error,setError]=useState(''),[missing,setMissing]=useState<DocumentoTipo[]>([]),[busy,setBusy]=useState(false);
 const summary=useRef<HTMLDivElement>(null),lock=useRef(false);
 useEffect(()=>{if(error)summary.current?.focus();},[error]);
 async function send(){
  if(lock.current)return;
  const absent=(['cedula','titulo_bachiller'] as DocumentoTipo[]).filter(tipo=>!documents.some(doc=>doc.tipo===tipo&&doc.estado!=='faltante'));
  if(absent.length){setMissing(absent);setError(missingDocumentsMessage(absent));summary.current?.focus();return;}
  lock.current=true;setBusy(true);setError('');
  try{onSubmitted(await solicitudes.submit(session));}
  catch(e){if(e instanceof ApiError&&e.code==='SOLICITUD_INCOMPLETA') {const types=(e.detalles?.faltantes??['cedula','titulo_bachiller']).filter((tipo):tipo is DocumentoTipo=>tipo==='cedula'||tipo==='titulo_bachiller');setMissing(types);setError(missingDocumentsMessage(types));}else setError(solicitudMessage(e));}
  finally{lock.current=false;setBusy(false);}
 }
 return <div className={styles.form}>
  <p>Revisa los documentos antes de enviar tu solicitud a la escuela.</p>
  <p className="text-sm text-text-secondary">La cédula y el título de bachiller o certificado de décimo son obligatorios para enviar. La papeleta y el tipo de sangre pueden entregarse después en la escuela.</p>
  <div ref={summary} tabIndex={-1} role={error?'alert':undefined} className={error?'rounded-sm border border-status-error bg-status-error-bg p-4 text-status-error':undefined}>{error}</div>
  <ul className={styles.form}>{DOCUMENTOS.map(({tipo,label})=>{const doc=documents.find(doc=>doc.tipo===tipo);return <li className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border p-3" key={tipo}><span>{label}</span><StatusBadge status={doc?'recibido':'faltante'} label={doc?'Subido':'Falta subir'} tone={doc?'success':'warning'}/></li>;})}</ul>
  <div className={styles.stepActions}><Button onClick={()=>void send()} isLoading={busy}>Enviar solicitud</Button><Button variant="secondary" disabled={busy} onClick={()=>onBack(missing)}>Revisar documentos</Button></div>
 </div>;
}
