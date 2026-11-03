'use client';
import {useEffect,useRef,useState} from 'react';
import {solicitudes} from '@/lib/api/solicitudes';
export const SOLICITUD_CHANGED_EVENT='solicitudes-actualizadas';
export function useSolicitudSummary(enabled:boolean){
 const [pending,setPending]=useState(0),[notice,setNotice]=useState(0),previous=useRef<number|null>(null);
 useEffect(()=>{if(!enabled)return;let alive=true,inflight=false;
  async function refresh(){if(inflight)return;inflight=true;try{const result=await solicitudes.summary();if(!alive)return;if(previous.current!==null&&result.pendientes>previous.current)setNotice(n=>n+1);previous.current=result.pendientes;setPending(result.pendientes);}catch{/* El contador no bloquea la navegación. */}finally{inflight=false;}}
  const visibleRefresh=()=>{if(document.visibilityState==='visible')void refresh();};
  void refresh();const timer=setInterval(visibleRefresh,30000);
  window.addEventListener('focus',visibleRefresh);window.addEventListener(SOLICITUD_CHANGED_EVENT,visibleRefresh);document.addEventListener('visibilitychange',visibleRefresh);
  return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',visibleRefresh);window.removeEventListener(SOLICITUD_CHANGED_EVENT,visibleRefresh);document.removeEventListener('visibilitychange',visibleRefresh);};
 },[enabled]);
 return {pending,notice,dismiss:()=>setNotice(0)};
}
