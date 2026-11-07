import {expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {DataStep} from '@/components/inscripcion/DataStep';
import {applicantAge} from '@/components/inscripcion/applicantValidation';
it('calcula edad con el día de Guayaquil',()=>{expect(applicantAge('2011-10-29',new Date('2026-10-29T04:00:00Z'))).toBe(14);});
it('muestra error junto a nacimiento sin bloquear el calendario',async()=>{
 render(<DataStep session={{solicitudId:'s',token:'t'}} onSaved={vi.fn()}/>);const user=userEvent.setup();
 const birth=screen.getByLabelText('Fecha de nacimiento');expect(birth).not.toHaveAttribute('max');
 await user.type(birth,'2020-01-01');await user.click(screen.getByRole('button',{name:'Guardar datos y continuar'}));
 expect(birth).toHaveAttribute('aria-invalid','true');expect(screen.getAllByText(/Debes tener al menos 15/).length).toBeGreaterThan(0);
});
