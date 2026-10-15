# Entrega: acceso y eliminación de estudiantes

Ticket sugerido: «Frontend: acceso, reservas y eliminación reintentable de alumnos».

La entrega amplía `/admin/students/:id` y añade `/admin/students/deletions`, bajo la protección admin existente. Reutiliza Modal, controles, tokens, cliente API y `useFetch`; no añade dependencias. El frontend no reintenta mutaciones automáticamente.

La confirmación de cédula solo vive en memoria y en el POST requerido por el backend, con `autoComplete="off"`. No se guarda en URL, almacenamiento ni logs. La navegación de éxito usa `/admin/students?aviso=alumno-eliminado`: el parámetro es fijo y no incluye datos del alumno. El listado muestra el aviso y al cambiar filtros se elimina ese parámetro. UUID y fechas de operaciones siguen visibles aunque el perfil ya no exista. Copiar UUID requiere permiso del navegador; si falla, se ofrece copiar el texto manualmente.

Las pruebas Vitest usan mocks del contrato B/D; no conectan al backend ni a datos reales. D requiere 026 y sus endpoints desplegados antes de publicar esta UI. La entrega no incluyó prueba extremo a extremo mientras D no estaba desplegada.

Verificación realizada con `npm run lint`, `npm run build` y `npm test`. Para validación manual con backend y datos ficticios: desactivar/reactivar, reservas con conflictos, modal con coincidencia exacta/cancelación, éxito de borrado con redirección, reintento sin perfil, filtros/paginación y copiar UUID.

Archivos de la entrega:

- `hooks/useFetch.ts`, `tests/hooks/useFetch.test.ts`.
- `types/student.ts`, `lib/api/studentActions.ts`, `lib/api/studentProfile.ts`.
- `app/(admin)/admin/students/StudentDetail.tsx`, `StudentActions.tsx`, `StudentReservations.tsx`, `StudentEditForm.tsx`, `page.tsx` y `deletions/page.tsx`.
- `tests/lib/api/studentActions.test.ts`.
- `tests/app/(admin)/admin/students/StudentActions.test.tsx`, `StudentReservations.test.tsx`, `StudentDeletions.test.tsx`, `StudentEditForm.test.tsx` y `students.test.tsx`.
- `README.md`.
