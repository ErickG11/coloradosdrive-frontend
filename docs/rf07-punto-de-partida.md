# Certificación digital (RF-07): punto de partida

El mapa técnico completo vive en el backend: `coloradosdrive-backend/docs/rf07-punto-de-partida.md`.

Lo que toca al frontend:

- Aviso de éxito: usar `useToast()` (`components/ui/Toast.tsx`), no un componente propio.
- Pantallas nuevas del certificado (descarga en el perfil del alumno, revocación y regeneración del administrador, página pública de verificación) deben consumir la API del backend y no recalcular los requisitos de emisión.
- La página pública muestra solo nombre, tipo de curso y fecha: sin cédula ni calificaciones.
