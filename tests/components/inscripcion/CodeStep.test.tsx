import {beforeEach,expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('@/lib/api/solicitudes',()=>({solicitudes:{confirmCode:vi.fn(),sendCode:vi.fn()},solicitudMessage:()=> 'El código es incorrecto o venció.'}));
import {solicitudes} from '@/lib/api/solicitudes';
import {CodeStep} from '@/components/inscripcion/CodeStep';
beforeEach(()=>vi.clearAllMocks());
it('conserva el cero inicial al pegar y entrega el token al coordinador',async()=>{
 const verified=vi.fn();vi.mocked(solicitudes.confirmCode).mockResolvedValue({solicitudId:'s',token:'temporal'});
 render(<CodeStep correo="ana@example.com" courseId="c" onVerified={verified} onBack={vi.fn()} onNotice={vi.fn()}/>);
 const user=userEvent.setup();await user.click(screen.getByLabelText('Código de verificación'));await user.paste('012345');await user.click(screen.getByRole('button',{name:'Verificar código'}));
 expect(solicitudes.confirmCode).toHaveBeenCalledWith('ana@example.com','012345');expect(verified).toHaveBeenCalledWith({solicitudId:'s',token:'temporal'});
});
it('mantiene el error visible y permite reenviar',async()=>{
 vi.mocked(solicitudes.confirmCode).mockRejectedValue(new Error('x'));vi.mocked(solicitudes.sendCode).mockResolvedValue({message:'ok'});
 const notice=vi.fn();render(<CodeStep correo="a@example.com" courseId="c" onVerified={vi.fn()} onBack={vi.fn()} onNotice={notice}/>);
 const user=userEvent.setup();await user.type(screen.getByLabelText('Código de verificación'),'123456');await user.click(screen.getByRole('button',{name:'Verificar código'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('incorrecto o venció');await user.click(screen.getByRole('button',{name:'Reenviar código'}));expect(notice).toHaveBeenCalled();
});
