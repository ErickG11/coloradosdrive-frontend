# RF-04: calificaciones en el panel del administrador

En **Admin → Instructores**, la sección «Calificaciones de instructores» muestra el ranking general de todos los cursos. La gestión existente de instructores sigue disponible en la misma pantalla. Sus filtros no afectan al ranking.

El ranking conserva el orden del backend y muestra posición global, nombre, estado inactivo cuando corresponde, promedio y cantidad de respuestas. Con menos de tres respuestas aparece «Pocas calificaciones». Sin respuestas muestra «Sin calificaciones», sin sustituir el promedio nulo por cero.

Al pulsar el nombre se abre un modal con el resumen, las cinco barras de estrellas y la lista paginada de puntuaciones y comentarios. Las barras muestran cantidad y porcentaje visibles y accesibles para lectores de pantalla. El desglose viene completo del backend: no se calcula a partir de los comentarios de la página ni se ajustan los porcentajes para sumar 100. Un comentario ausente no añade texto de relleno.

Ranking y comentarios usan páginas de 10 elementos y paginación independiente. El modal consulta el detalle al abrirlo, reinicia la página al cambiar de instructor y usa el foco, cierre con Escape y restauración del foco del componente Modal existente. Las peticiones usan `useFetch` y el cliente `api` autenticado. Carga y errores se muestran en cada sección con opción de reintentar. La tabla se convierte en tarjetas en móvil y utiliza los tokens existentes para ambos temas.

Los componentes viven exclusivamente bajo `app/(admin)/admin/instructors`. El guard de `proxy.ts` exige rol `admin` para `/admin` y sus subrutas; el menú de instructores solo se ofrece al administrador. El backend también exige ese rol en ambos endpoints. No hay vistas de ranking en alumno o instructor.

Solo se renderizan los campos públicos del contrato de `rf04-b.md`: el detalle individual muestra puntuación y comentario, sin alumno, franja, práctica ni fechas. Los comentarios se presentan como texto escapado de React. El contenido libre escrito por un alumno no se transforma ni se interpreta como HTML.

Las pruebas simulan `api`, usan el hook real y cubren orden, estados mixtos, paginación, apertura por teclado, cierre y foco, desglose sin respuestas, comentarios opcionales, errores y exclusión de metadatos identificativos inesperados. No realizan peticiones a Supabase.
