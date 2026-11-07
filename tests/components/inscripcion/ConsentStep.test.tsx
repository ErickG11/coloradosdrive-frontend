import {expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('@/lib/api/solicitudes',()=>({solicitudes:{notice:vi.fn(),consent:vi.fn()},solicitudMessage:()=> 'Error'}));
import {solicitudes} from '@/lib/api/solicitudes';
import {ConsentStep} from '@/components/inscripcion/ConsentStep';
it('empieza sin casillas y exige ambas antes de guardar la versión vigente',async()=>{
 vi.mocked(solicitudes.notice).mockResolvedValue({version:'2026-10-v1',contactoDerechos:'contacto@example.com',retencionDias:30});vi.mocked(solicitudes.consent).mockResolvedValue({version:'2026-10-v1'});
 const accepted=vi.fn(),session={solicitudId:'s',token:'t'};render(<ConsentStep session={session} onAccepted={accepted}/>);
 const next=await screen.findByRole('button',{name:'Continuar a datos personales'});expect(next).toBeDisabled();const user=userEvent.setup();const boxes=screen.getAllByRole('checkbox');
 expect(boxes[0]).not.toBeChecked();await user.click(boxes[0]);expect(next).toBeDisabled();await user.click(boxes[1]);await user.click(next);
 expect(solicitudes.consent).toHaveBeenCalledWith(session,'2026-10-v1');expect(accepted).toHaveBeenCalledOnce();
});
