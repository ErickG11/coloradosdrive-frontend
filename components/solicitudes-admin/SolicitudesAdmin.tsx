'use client';
import {useState} from 'react';
import {useFetch} from '@/hooks/useFetch';
import {DataTable} from '@/components/ui/DataTable';
import {Select} from '@/components/ui/Select';
import {Input} from '@/components/ui/Input';
import {Button} from '@/components/ui/Button';
import {Pagination} from '@/components/ui/Pagination';
import type {SolicitudAdmin,SolicitudPage,SolicitudDecision} from '@/types/solicitud';
import {Toast} from '@/components/inscripcion/Toast';
import {ReviewOutcome} from './ReviewOutcome';
import {SolicitudDetail} from './SolicitudDetail';
import styles from './solicitudes.module.css';
export function SolicitudesAdmin(){
 const [estado,setEstado]=useState('pendiente_revision'),[draft,setDraft]=useState(''),[q,setQ]=useState(''),[page,setPage]=useState(1);
 const query=new URLSearchParams({page:String(page),pageSize:'20',...(estado?{estado}:{}),...(q?{q}:{})});
 const {data,isLoading,error,refetch}=useFetch<SolicitudPage>(`/admin/solicitudes?${query}`);
 const [message,setMessage]=useState(''),[decision,setDecision]=useState<SolicitudDecision|null>(null);
 const rows=data?.items??[];
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const selected=rows.find(s=>s.id===selectedId);
 return <div className={styles.workspace}>
  <h1 className="text-2xl font-bold text-text-primary">Solicitudes de inscripción</h1>
  <Toast message={message} onDismiss={()=>setMessage('')}/>
  {decision?<ReviewOutcome decision={decision}/>:null}
  <div className={styles.filters}>
   <Select label="Estado" value={estado} onChange={e=>{setEstado(e.target.value);setPage(1);}}><option value="">Todos</option><option value="pendiente_revision">Pendientes</option><option value="aprobada">Aprobadas</option><option value="rechazada">Rechazadas</option></Select>
   <form className={styles.controls} onSubmit={e=>{e.preventDefault();setQ(draft.trim());setPage(1);}}><Input label="Buscar por cédula, nombre o correo" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={100}/><Button type="submit">Buscar</Button></form>
  </div>
  <DataTable<SolicitudAdmin> caption="Solicitudes de inscripción" rows={rows} getRowKey={s=>s.id} isLoading={isLoading} error={error} onRetry={refetch} mobileCards columns={[
   {key:'nombre',header:'Postulante',render:s=>s.nombreCompleto},
   {key:'cedula',header:'Cédula',render:s=>s.cedula},
   {key:'correo',header:'Correo',render:s=>s.correo},
   {key:'detail',header:'Revisión',render:s=><Button variant="secondary" onClick={()=>setSelectedId(s.id)}>Revisar solicitud</Button>},
   {key:'estado',header:'Estado',render:s=>s.estado==='pendiente_revision'?'Pendiente de revisión':s.estado==='aprobada'?'Aprobada':'Rechazada'},
  ]}/>
  {selected?<SolicitudDetail solicitud={selected} onClose={()=>setSelectedId(null)} onDone={(message,result)=>{setMessage(message);if(result)setDecision(result);refetch();}}/>:null}
  <Pagination total={data?.total??0} page={page} pageSize={20} singular="solicitud" plural="solicitudes" onPageChange={setPage} disabled={isLoading}/>
 </div>;
}
