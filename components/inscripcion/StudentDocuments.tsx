'use client';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {FormError} from '@/components/ui/FormError';
import {getStudentDocuments,uploadStudentDocument,type StudentDocuments as Documents} from '@/lib/api/studentDocuments';
import {solicitudMessage} from '@/lib/api/solicitudes';
import type {DocumentoTipo} from '@/types/solicitud';
import {DOCUMENTOS} from '@/types/solicitud';
import {DocumentUpload} from './DocumentUpload';
import {documentFileError} from './DocumentsStep';
import {Toast} from './Toast';
import styles from './inscripcion.module.css';
const labels={sin_subir:'Sin subir',en_revision:'En revisión',aprobado:'Aprobado',rechazado:'Rechazado'};
export function StudentDocuments(){
 const [data,setData]=useState<Documents|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[retry,setRetry]=useState(0);
 const [errors,setErrors]=useState<Record<string,string>>({}),[busy,setBusy]=useState<Record<string,boolean>>({});const locks=useRef(new Set<string>());
 useEffect(()=>{let alive=true;getStudentDocuments().then(result=>{if(alive)setData(result);}).catch(e=>{if(alive)setError(solicitudMessage(e));});return()=>{alive=false;};},[retry]);
 async function upload(tipo:DocumentoTipo,file:File){const invalid=documentFileError(file);setErrors(prev=>({...prev,[tipo]:invalid}));if(invalid||locks.current.has(tipo))return;locks.current.add(tipo);setBusy(prev=>({...prev,[tipo]:true}));
  try{await uploadStudentDocument(tipo,file);setData(await getStudentDocuments());setMessage('Documento recibido.');}catch(e){setErrors(prev=>({...prev,[tipo]:solicitudMessage(e)}));}finally{locks.current.delete(tipo);setBusy(prev=>({...prev,[tipo]:false}));}}
 return <section className="grid min-w-0 gap-6"><header><h1 className="font-display text-2xl font-bold">Mis documentos</h1><p className="mt-2 text-text-secondary">Consulta la revisión digital y la entrega física de tus documentos.</p></header>
  <Toast message={message} onDismiss={()=>setMessage('')}/><FormError>{error}</FormError>
  {error?<Button onClick={()=>{setError('');setRetry(n=>n+1);}}>Reintentar</Button>:!data?<p role="status">Cargando documentos…</p>:<>
   {!data.puedeSubir?<p>No hay una solicitud en línea vinculada. Consulta con la escuela para completar tu expediente.</p>:null}
   {!data.documentos.length?<p>No hay documentos disponibles.</p>:<div className={styles.documentsGrid}>{data.documentos.map(doc=>{
    const label=DOCUMENTOS.find(item=>item.tipo===doc.tipo)?.label??doc.tipo;
    const physical=<p className="text-sm text-text-secondary">Entrega física: {doc.estadoFisico==='entregado'?'Entregado':doc.estadoFisico==='no_aplica'?'No aplica':doc.estadoFisico==='pendiente'?'Pendiente':'Sin registro'}</p>;
    return <div key={doc.tipo} className="grid content-start gap-3">{doc.estado==='aprobado'||!data.puedeSubir?<Card title={label}><div className={styles.form}><StatusBadge status={doc.estado} label={labels[doc.estado]} tone={doc.estado==='aprobado'?'success':'warning'}/><p>{doc.obligatorio?'Obligatorio':'Opcional'}</p>{doc.exento?<p>No se exige desde los 65 años cumplidos.</p>:null}{doc.motivoRechazo?<p>Motivo: {doc.motivoRechazo}</p>:null}</div></Card>:<DocumentUpload tipo={doc.tipo} label={label} estado={doc.estado==='en_revision'?'recibido':doc.estado} obligatorio={doc.obligatorio} displayStatus={labels[doc.estado]} reason={doc.motivoRechazo??undefined} busy={busy[doc.tipo]} error={errors[doc.tipo]} onFile={file=>void upload(doc.tipo,file)}/>}{physical}</div>;
   })}</div>}
  </>}
 </section>;
}
