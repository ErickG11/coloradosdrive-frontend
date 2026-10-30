'use client';
import {Modal} from '@/components/ui/Modal';
import {Card} from '@/components/ui/Card';
import {useFetch} from '@/hooks/useFetch';
import type {PublicCourse} from '@/types/publicCourse';
import {DOCUMENTOS,type SolicitudAdmin} from '@/types/solicitud';
import styles from './solicitudes.module.css';
export function SolicitudDetail({solicitud,onClose}:{solicitud:SolicitudAdmin;onClose:()=>void}){
 const {data:courses}=useFetch<PublicCourse[]>('/public/courses');
 const consent=solicitud.consentimiento;
 const status:Record<string,string>={recibido:'Recibido',aprobado:'Aprobado',rechazado:'Rechazado',faltante:'Faltante',no_aplica:'No aplica'};
 return <Modal isOpen onClose={onClose} title={`Solicitud de ${solicitud.nombreCompleto}`}>
  <div className={styles.detail}>
   <dl className={styles.detail}>
    {[
     ['Cédula',solicitud.cedula],['Correo',solicitud.correo],['Teléfono',solicitud.telefono??'No indicado'],
     ['Nacimiento',solicitud.fechaNacimiento??'No indicado'],['Curso',Array.isArray(courses)?courses.find(c=>c.id===solicitud.courseId)?.nombre??'No disponible':'Cargando…'],
     ['Fecha de solicitud',solicitud.solicitadaAt?new Date(solicitud.solicitadaAt).toLocaleString('es-EC',{timeZone:'America/Guayaquil'}):'Sin datos guardados'],
    ].map(([label,value])=><div key={label}><dt className="text-sm text-text-secondary">{label}</dt><dd>{value}</dd></div>)}
   </dl>
   <Card title="Consentimiento">
    {consent?<div className={styles.detail}><p>Versión: {consent.version}</p><p>Aceptado: {new Date(consent.aceptadoAt).toLocaleString('es-EC',{timeZone:'America/Guayaquil'})}</p>
     {consent.representanteNombre?<><p>Representante: {consent.representanteNombre}</p><p>Cédula del representante: {consent.representanteCedula}</p><p>Autorización: {consent.representanteAcepta?'Registrada':'Pendiente'}</p></>:<p>Sin representante registrado.</p>}
    </div>:<p>No hay consentimiento registrado.</p>}
   </Card>
   <h3 className="font-semibold">Documentos digitales</h3>
   {DOCUMENTOS.map(({tipo,label})=>{const doc=solicitud.documentos.find(d=>d.tipoDocumento===tipo);return <Card key={tipo}><div className={styles.detail}><h4 className="font-medium">{label}</h4><p>{status[doc?.estado??'faltante']??doc?.estado}</p>{doc?.motivoRechazo?<p>Motivo: {doc.motivoRechazo}</p>:null}</div></Card>;})}
   <p className="text-sm text-text-secondary">Los faltantes no bloquean la decisión. El checklist físico se gestiona desde la matrícula del alumno.</p>
  </div>
 </Modal>;
}
