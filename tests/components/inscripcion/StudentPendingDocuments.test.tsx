import {expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
vi.mock('@/hooks/useFetch',()=>({useFetch:vi.fn()}));
import {useFetch} from '@/hooks/useFetch';
import {StudentPendingDocuments} from '@/components/inscripcion/StudentPendingDocuments';
it('oculta el bloque cuando no hay pendientes',()=>{
 vi.mocked(useFetch).mockReturnValue({data:{documentosPendientes:[]},isLoading:false,error:null,refetch:vi.fn()});const {container}=render(<StudentPendingDocuments/>);expect(container).toBeEmptyDOMElement();
});
it('muestra plazo y mensaje de cohorte pendiente',()=>{
 vi.mocked(useFetch).mockReturnValue({data:{documentosPendientes:['cedula'],fechaLimite:'2026-11-10',diasRestantes:5,cohortePendiente:true},isLoading:false,error:null,refetch:vi.fn()});render(<StudentPendingDocuments/>);
 expect(screen.getByRole('status')).toHaveTextContent('Te quedan 5 días');expect(screen.getByText(/Tu matrícula está pendiente de cohorte/)).toBeInTheDocument();
});
