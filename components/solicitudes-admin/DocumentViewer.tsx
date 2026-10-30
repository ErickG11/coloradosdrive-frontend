'use client';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/Button';
import {FormError} from '@/components/ui/FormError';
import {solicitudes,solicitudMessage} from '@/lib/api/solicitudes';
import styles from './solicitudes.module.css';
export function DocumentViewer({solicitudId,documentoId}:{solicitudId:string;documentoId:string}){
 const [link,setLink]=useState<{url:string;expiresIn:number}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);const lock=useRef(false);
 useEffect(()=>{if(!link)return;const timer=setTimeout(()=>setLink(null),Math.min(link.expiresIn,300)*1000);return()=>clearTimeout(timer);},[link]);
 async function view(){if(lock.current)return;lock.current=true;setBusy(true);setError('');setLink(null);
  try{setLink(await solicitudes.documentUrl(solicitudId,documentoId));}catch(e){setError(solicitudMessage(e));}finally{lock.current=false;setBusy(false);}}
 return <div className={styles.detail}>
  <Button variant="secondary" isLoading={busy} onClick={()=>void view()}>Ver</Button>
  <FormError>{error}</FormError>
  {link?<div className={styles.detail}><a className="underline" href={link.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Abrir documento en otra pestaña</a><p className="text-sm text-text-secondary">Enlace válido por 5 minutos. Pulsa Ver para renovarlo si vence.</p></div>:null}
 </div>;
}
