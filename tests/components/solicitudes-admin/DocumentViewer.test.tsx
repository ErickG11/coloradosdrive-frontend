import {expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('@/lib/api/solicitudes',()=>({solicitudes:{documentUrl:vi.fn()},solicitudMessage:()=> 'Error'}));
import {solicitudes} from '@/lib/api/solicitudes';
import {DocumentViewer} from '@/components/solicitudes-admin/DocumentViewer';
it('no firma al montar y obtiene el enlace solo al pulsar Ver',async()=>{
 vi.mocked(solicitudes.documentUrl).mockResolvedValue({url:'https://signed.invalid/d',expiresIn:300});
 render(<DocumentViewer solicitudId="s" documentoId="d"/>);expect(solicitudes.documentUrl).not.toHaveBeenCalled();
 await userEvent.click(screen.getByRole('button',{name:'Ver'}));expect(solicitudes.documentUrl).toHaveBeenCalledWith('s','d');
 expect(await screen.findByRole('link',{name:'Abrir documento en otra pestaña'})).toHaveAttribute('rel','noopener noreferrer');
});
