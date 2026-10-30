import { beforeEach, expect, it, vi } from 'vitest';
import { render,screen,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('@/lib/api/solicitudes',()=>({solicitudes:{courses:vi.fn(),sendCode:vi.fn()},solicitudMessage:()=> 'Error de conexión'}));
vi.mock('@/components/theme/ThemeToggle',()=>({ThemeToggle:()=>null}));
import { solicitudes } from '@/lib/api/solicitudes';
import { InscripcionFlow } from '@/components/inscripcion/InscripcionFlow';
beforeEach(()=>{vi.clearAllMocks();vi.mocked(solicitudes.courses).mockResolvedValue([{id:'a',tipo:'A',nombre:'Motos mañana',horasRequeridas:15},{id:'b',tipo:'A',nombre:'Motos tarde',horasRequeridas:15}]);vi.mocked(solicitudes.sendCode).mockResolvedValue({message:'ok'});});
it('preselecciona por UUID y distingue nombres del mismo tipo',async()=>{
 render(<InscripcionFlow initialCourseId="b"/>);
 expect(await screen.findByLabelText('Curso')).toHaveValue('b');
 expect(screen.getByRole('option',{name:'Tipo A — Motos mañana'})).toBeInTheDocument();
});
it('envía correo y curso, y muestra el paso de código',async()=>{
 render(<InscripcionFlow initialCourseId="a"/>);const user=userEvent.setup();
 await user.type(await screen.findByLabelText('Correo electrónico'),'ana@example.com');
 await user.click(screen.getByRole('button',{name:'Enviar código'}));
 await waitFor(()=>expect(solicitudes.sendCode).toHaveBeenCalledWith('ana@example.com','a'));
 expect(await screen.findByText('2. Verifica tu correo')).toBeInTheDocument();
});
