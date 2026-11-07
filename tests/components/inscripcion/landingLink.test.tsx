import {expect,it} from 'vitest';
import {render,screen} from '@testing-library/react';
import {CourseCard} from '@/components/landing/CourseCard';
it('habilita el enlace de inscripción con el curso elegido',()=>{
 render(<CourseCard course={{id:'curso-a',tipo:'A',nombre:'Motos',horasRequeridas:15}}/>);
 expect(screen.getByRole('link',{name:'Solicitar inscripción'})).toHaveAttribute('href','/inscripcion?courseId=curso-a');
});
