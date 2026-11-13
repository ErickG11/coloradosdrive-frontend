# I18 · presentación del flujo público y Mi inscripción

En feat/inscripcion-en-linea-ui, sin subagentes. Parte A visual exclusivamente;
Parte B Cohortes irá en fix/cohortes-color-y-foco desde origin/main, tras commit A.
No backend/.env/servidores/pruebas/push en A. No APIs/contratos/validaciones/estados nuevos.

Causa A1: .fieldHelp de inscripcion.module.css tenía margin-top:-0.75rem; además
.surface [role=alert] creaba cajas que alteraban el espacio del error. Eliminados.
EnrollmentField/Input/Select reusan controles compartidos sin modificarlos, mantienen
refs/handlers y aria, con etiqueta/control/error/ayuda en bloques separados gap6px.
RequiredMark rojo aria-hidden; checkbox local20px con CheckIcon existente; enlaces
secundarios conservan navegación vía estilos Button. Requisitos en filas separadas.
Errores de formulario junto a acciones; grid align-items:start. CSS facts huérfano retirado.
Typecheck/lint fuente OK. Build A en curso. Sin pruebas nuevas ni ejecutadas.
Revisión manual pendiente: requisitos/correo/código/consentimiento/datos/estudios/revisar/
seguimiento/crear contraseña y Mi inscripción, errores+ayudas largos, foco/casillas/
retornos, claro/oscuro375/768/1280px.

Parte A CERRADA b8e79f20f2e3b5904f57f45a172eea32c8dfd20b. Typecheck fuente,
eslint alcance inscripción/alumno y build webpack33/33 OK; tsconfig restaurado sin diff.
No tests ni servidores iniciados. Árbol tracked limpio. Parte B en curso desde origin/main;
volver a feat/inscripcion-en-linea-ui al terminar. Archivo local sin commit.

Parte B CERRADA y PUBLICADA solo fix/cohortes-color-y-foco:
5605e3b variables /new;ba67f5f borde inválido/ARIA;f397ade foco fechas;
894fe31 foco retorno de eliminación. Cuatro commits sin trailers. 86 tests en3archivos
(CohortForm65,Workspace+Modal21),10 casos nuevos. Sin Playwright. npm run typecheck
no existe; tras regenerar rutas, tsc --noEmit --incremental false global OK.
npm run lint excluyendo solo.claude local OK. package-lock sin cambios. PR no abierto;
texto disponible en /tmp/cohortes-pr.md. Push inicialmente rechazado por confundir
restricción A con autorización B; revisión aceptó el mismo push al presentar autorización
explícita y diff limitado, sin cambiar método. Repo devuelto a feat/inscripcion-en-linea-ui,
I18b8e79f2 intacto; restauración de dependencias y tipos generados de esa rama.
