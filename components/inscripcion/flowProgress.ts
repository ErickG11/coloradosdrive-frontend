import type { SolicitudProgress } from '@/types/solicitud';
export type InscripcionStep = 'correo'|'codigo'|'reanudando'|'consentimiento'|'datos'|'documentos'|'enviado';
export function firstIncompleteStep(p:SolicitudProgress):InscripcionStep{
 if(!p.correoVerificado)return 'correo';
 if(p.estado==='aprobada')return 'enviado';
 if(!p.consentimientoVigente)return 'consentimiento';
 if(!p.datosGuardados||p.estado==='rechazada'||(p.requiereRepresentante&&!p.representanteCompleto))return 'datos';
 // La entrega de documentos es opcional. Siempre se puede volver para añadir faltantes.
 return p.documentos.length===4?'enviado':'documentos';
}
