import type { Metadata } from 'next';
import { InscripcionFlow } from '@/components/inscripcion/InscripcionFlow';
export const metadata: Metadata = { title: 'Solicitar inscripción' };
export default async function InscripcionPage({ searchParams }: { searchParams: Promise<{ courseId?: string }> }) {
 const params = await searchParams;
 return <InscripcionFlow initialCourseId={typeof params.courseId === 'string' ? params.courseId : ''}/>;
}
