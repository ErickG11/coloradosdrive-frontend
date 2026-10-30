import {expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {DocumentsStep,documentFileError} from '@/components/inscripcion/DocumentsStep';
it('valida tipo y máximo de 5 MiB',()=>{
 expect(documentFileError(new File(['x'],'a.exe',{type:'application/octet-stream'}))).toContain('JPG');
 expect(documentFileError(new File([new Uint8Array(5*1024*1024+1)],'a.pdf',{type:'application/pdf'}))).toContain('5 MiB');
});
it('permite finalizar sin documentos y muestra el nombre de décimo',async()=>{
 const finish=vi.fn();render(<DocumentsStep session={{solicitudId:'s',token:'t'}} onFinish={finish} onNotice={vi.fn()}/>);
 expect(screen.getByLabelText('Título de bachiller o certificado de décimo')).toBeInTheDocument();
 await userEvent.click(screen.getByRole('button',{name:'Finalizar solicitud'}));expect(finish).toHaveBeenCalledOnce();
});
