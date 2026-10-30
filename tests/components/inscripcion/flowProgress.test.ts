import {expect,it} from 'vitest';
import {firstIncompleteStep} from '@/components/inscripcion/flowProgress';
import type {SolicitudProgress} from '@/types/solicitud';
const progress:SolicitudProgress={courseId:'original',estado:'pendiente_revision',correoVerificado:true,consentimientoVigente:true,datosGuardados:true,solicitadaAt:'2026-10-01',requiereRepresentante:false,representanteCompleto:false,documentos:[]};
it('reanuda en el primer paso incompleto y permite faltantes',()=>{
 expect(firstIncompleteStep({...progress,consentimientoVigente:false})).toBe('consentimiento');
 expect(firstIncompleteStep({...progress,requiereRepresentante:true})).toBe('datos');
 expect(firstIncompleteStep(progress)).toBe('documentos');
 expect(firstIncompleteStep({...progress,estado:'aprobada'})).toBe('enviado');
});
