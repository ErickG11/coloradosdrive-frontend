import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast } from '@/components/inscripcion/Toast';
it('anuncia el éxito y permite cerrarlo con teclado',async () => {
 const dismiss=vi.fn();render(<Toast message="Solicitud actualizada" onDismiss={dismiss}/>);
 expect(screen.getByRole('status')).toHaveTextContent('Solicitud actualizada');
 const user=userEvent.setup();await user.tab();await user.keyboard('{Enter}');expect(dismiss).toHaveBeenCalledOnce();
});
