import {expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
vi.mock('@/hooks/useFetch',()=>({useFetch:()=>({data:[]})}));
import {SolicitudDetail} from '@/components/solicitudes-admin/SolicitudDetail';
import type {SolicitudAdmin} from '@/types/solicitud';
export const solicitud:SolicitudAdmin={id:'s',courseId:'c',cedula:'1710034065',nombreCompleto:'Ana',correo:'ana@example.com',telefono:null,fechaNacimiento:'2010-01-01',estado:'pendiente_revision',motivoRechazo:null,createdAt:'2026-10-01',solicitadaAt:'2026-10-01',consentimiento:{version:'2026-10-v1',aceptadoAt:'2026-10-01',representanteNombre:'Representante',representanteCedula:'1710034065',representanteAcepta:true},documentos:[]};
it('muestra datos, consentimiento, representante y checklist en el modal',()=>{
 render(<SolicitudDetail solicitud={solicitud} onClose={vi.fn()}/>);
 expect(screen.getByRole('dialog')).toHaveAccessibleName('Solicitud de Ana');
 expect(screen.getByText('Versión: 2026-10-v1')).toBeInTheDocument();expect(screen.getByText('Representante: Representante')).toBeInTheDocument();expect(screen.getAllByText('Faltante')).toHaveLength(4);
});
