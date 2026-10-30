import {beforeEach,expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('@/lib/api/solicitudes',()=>({solicitudes:{decide:vi.fn(),reviewDocument:vi.fn()},solicitudMessage:()=> 'Error'}));
import {solicitudes} from '@/lib/api/solicitudes';
import {ReviewActions} from '@/components/solicitudes-admin/ReviewActions';
beforeEach(()=>vi.clearAllMocks());
it('exige confirmación antes de aprobar y entrega la cohorte',async()=>{
 const result={id:'s',estado:'aprobada',studentId:'u',correoEnviado:false,cohorteAsignada:{cohortId:null,estado:'pendiente_cohorte'}};vi.mocked(solicitudes.decide).mockResolvedValue(result);const done=vi.fn();render(<ReviewActions id="s" onDone={done}/>);
 const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Aprobar solicitud'}));expect(solicitudes.decide).not.toHaveBeenCalled();await user.click(screen.getByRole('button',{name:'Confirmar aprobación'}));expect(done).toHaveBeenCalledWith('Solicitud aprobada.',result);
});
it('no rechaza sin motivo y envía el motivo escrito',async()=>{
 vi.mocked(solicitudes.reviewDocument).mockResolvedValue({});render(<ReviewActions id="s" documentoId="d" onDone={vi.fn()}/>);const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Rechazar documento'}));await user.click(screen.getByRole('button',{name:'Confirmar rechazo'}));expect(solicitudes.reviewDocument).not.toHaveBeenCalled();await user.type(screen.getByLabelText('Motivo del rechazo'),'Ilegible');await user.click(screen.getByRole('button',{name:'Confirmar rechazo'}));expect(solicitudes.reviewDocument).toHaveBeenCalledWith('s','d','rechazado','Ilegible');
});
