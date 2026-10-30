import type { Metadata } from 'next';
import { SolicitudesAdmin } from '@/components/solicitudes-admin/SolicitudesAdmin';
export const metadata: Metadata = { title: 'Solicitudes de inscripción' };
export default function Page(){return <SolicitudesAdmin/>;}
