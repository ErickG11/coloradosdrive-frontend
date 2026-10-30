import {expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('@/hooks/useFetch',()=>({useFetch:vi.fn()}));
import {useFetch} from '@/hooks/useFetch';
import {SolicitudesAdmin} from '@/components/solicitudes-admin/SolicitudesAdmin';
it('envía filtro y búsqueda con paginación',async()=>{
 vi.mocked(useFetch).mockReturnValue({data:{items:[],total:0,page:1,pageSize:20},isLoading:false,error:null,refetch:vi.fn()});
 render(<SolicitudesAdmin/>);const user=userEvent.setup();await user.selectOptions(screen.getByLabelText('Estado'),'rechazada');await user.type(screen.getByLabelText('Buscar por cédula, nombre o correo'),'Ana');await user.click(screen.getByRole('button',{name:'Buscar'}));
 expect(useFetch).toHaveBeenLastCalledWith('/admin/solicitudes?page=1&pageSize=20&estado=rechazada&q=Ana');
});
