import type { Metadata } from 'next';
import { PrivacyPage } from '@/components/inscripcion/PrivacyNotice';
export const metadata: Metadata = { title: 'Aviso de privacidad (borrador)' };
export default function Page(){return <PrivacyPage/>;}
