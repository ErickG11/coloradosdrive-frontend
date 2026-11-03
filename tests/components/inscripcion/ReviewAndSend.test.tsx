import {beforeEach,expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ReviewAndSend} from '@/components/inscripcion/ReviewAndSend';
import {solicitudes} from '@/lib/api/solicitudes';
import {ApiError} from '@/lib/api/errors';
import type {DocumentoTipo} from '@/types/solicitud';
vi.mock('@/lib/api/solicitudes',()=>({solicitudes:{submit:vi.fn()},solicitudMessage:()=> 'Error de conexión'}));
beforeEach(()=>vi.clearAllMocks());
it.each([
 [[], 'Faltan la cédula y el título de bachiller o certificado de décimo'],
 [['titulo_bachiller'],'Falta subir la cédula'],[['cedula'],'Falta subir el título de bachiller o certificado de décimo'],
] as [DocumentoTipo[],string][])('valida obligatorios %j sin enviar y enfoca el resumen',async(tipos,message)=>{
 render(<ReviewAndSend session={{solicitudId:'s',token:'t'}} documents={tipos.map(tipo=>({tipo,estado:'recibido'}))} onBack={vi.fn()} onSubmitted={vi.fn()}/>);
 const button=screen.getByRole('button',{name:'Enviar solicitud'});expect(button).toBeEnabled();await userEvent.click(button);expect(screen.getByRole('alert')).toHaveTextContent(message);expect(screen.getByRole('alert')).toHaveFocus();expect(solicitudes.submit).not.toHaveBeenCalled();
});
it('con ambos obligatorios envía y conserva el resultado del servidor',async()=>{
 const result={id:'s',estado:'enviada',enviadaAt:'2026-11-03'};vi.mocked(solicitudes.submit).mockResolvedValue(result);const done=vi.fn();
 render(<ReviewAndSend session={{solicitudId:'s',token:'t'}} documents={[{tipo:'cedula',estado:'rechazado'},{tipo:'titulo_bachiller',estado:'recibido'}]} onBack={vi.fn()} onSubmitted={done}/>);await userEvent.click(screen.getByRole('button',{name:'Enviar solicitud'}));expect(done).toHaveBeenCalledWith(result);
});
it('presenta los faltantes del servidor con el mismo resumen',async()=>{
 vi.mocked(solicitudes.submit).mockRejectedValue(new ApiError('Incompleta',400,{code:'SOLICITUD_INCOMPLETA',detalles:{faltantes:['cedula']}}));
 render(<ReviewAndSend session={{solicitudId:'s',token:'t'}} documents={[{tipo:'cedula',estado:'recibido'},{tipo:'titulo_bachiller',estado:'recibido'}]} onBack={vi.fn()} onSubmitted={vi.fn()}/>);await userEvent.click(screen.getByRole('button',{name:'Enviar solicitud'}));expect(await screen.findByRole('alert')).toHaveTextContent('Falta subir la cédula');
});
