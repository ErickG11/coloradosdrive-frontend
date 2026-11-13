# I16 · mapa visual y progreso local (sin commit)
2026-11-05. Solo frontend, rama feat/inscripcion-en-linea-ui. Sin backend/env,
pruebas, dependencias, tokens/globales/layouts raíz ni nuevos servidores.

## Primer paso: lectura sin editar código, completada
Referencia: StudentsWorkspace, StudentMetrics/Filters/Table/Drawer/Detail/Visual,
students.module.css, Sidebar/admin-sidebar.module.css y UI compartida.
- Alumnos: topbar64px con SearchInput y marca administrativa; título32px/28px móvil,
  contador PageHeader, acciones Button/buttonClassName; área principal gap20px.
- Métricas: cuatro columnas (dos estrechas), radio10px, borde fino, icono44px
  CIRCULAR (no cuadrado), valor26px y etiqueta12px. El código prevalece al brief.
- FilterChips redondos, selects; DataTable con filas rojizas, avatar40px y StatusBadge
  con punto. Reutilizar esos UI por importación, sin editarlos.
- Ficha: panel440px/410px con heading pegado, avatar52px, pestañas subrayadas,
  tarjetas9px y detalle en grid; acciones sticky. En móvil ocupa ancho completo.
- Modales y foco: Modal/useDialogFocus; mantener comportamiento, ids, aria y handlers.
- Button, Input, Select, Card, StatusBadge, DataTable, EmptyState, Pagination,
  PageHeader, XIcon y Toast verde son reutilizables sin modificaciones.
- StudentVisual está acoplado al módulo Alumnos: equivalente presentacional local
  para avatar/iconos con SVG de trazo1.6, no importar CSS ni lógica de ese módulo.
- No hay capturas de referencia disponibles: el adjunto contiene solo Pasted text.txt.
- SolicitudDetail actual no tiene pestañas: usar navegación por anclas con aspecto
  de pestañas, sin nuevo estado ni ocultar secciones/focos/formularios existentes.
- Los cuatro contadores pedidos ya existen en useResumenSolicitudes: presentar esos
  valores, sin llamadas ni cálculos nuevos de negocio. Conservar medidores actuales.
- /admin/seguridad solo monta MfaEnrolamiento; no hay tarjetas/controles de inscripción.
  Punto4 sin cambios para respetar el límite sobre seguridad existente.
- Shell alumno: reutilizar imagen existente de marca y CSS de navegación equivalente
  dentro de inscripción, condicionado solo al rol estudiante; admin/instructor intactos.
- Temas: usar exclusivamente tokens existentes, sin copiar overrides hex de Alumnos.
  Revisión de375/768/1280 y reduced-motion por lectura, no por navegador automatizado.

## Ejecución
1. Admin solicitudes y detalle: cerrado081b855.
2. Mi inscripción: cerrado931b1ff.
3. Público y crear contraseña: cerrado931b1ff.
4. Seguridad: verificado, sin superficie de inscripción; no tocar MFA.
5. Marca/navegación alumno: cerrado1aa6b4f.
6. Consistencia/typecheck/lint/build: cerrado1aa6b4f; tsconfig restaurado sin diff.

Punto1 cerrado:081b855. Métricas con resumen existente, tabla/avatar/estado,
filtros pill, drawer/card y navegación nativa por anclas (sin estado de pestaña
ni ocultar formularios). Medidores/modales/foco y selección conservados.
Typecheck aplicación y lint tocado OK. Revisión React de componentes de presentación.
Puntos2/3 implementados: CSS con tokens existentes, tres pasos alumno, documentos,
calendario/horas, reserva/timer, desglose y estados de pago, wizard público completo,
seguimiento y crear contraseña. Logo existente añadido sin rutas nuevas.
Revisión estática por AST contra basef09630f: attrs de comportamiento/ids/aria/refs
preservados y hooks sin cambios en11 archivosTSX. No es una suite de pruebas.
Typecheck aplicación y lint de inscripcion/student-enrollment OK. Sin suites ni HTTP.

## Cierre de I16
Puntos2/3:931b1ff. Puntos5/6:1aa6b4f. RevisiónReact/AST12TSX: hooks,
handlers, refs, ids y atributosaria/prueba preservados. Nuevos componentes puros
EnrollmentAvatar/Icon/Metric/Brand enEnrollmentVisual; CSS de superficie propio.
UI compartida, API, validación, permisos, datos, tiempos y textos existentes intactos.
No cambios aAlumnos, otros módulos, backend, env, dependencias, globals o layoutsraíz.
Shell soloSidebar.tsx y rama visual estudiante, con CSS de navegación admin existente.
Seguridad punto4: soloMFA, sin cambios por no haber controles de inscripción.
Consolidación de36reglas CSS duplicadas; tokens existentes, sin nuevos colores.
375: cards2columnas métricas, formulariosflexibles, pasos adaptados y drawer100%.
768: drawer440px, métricas2columnas, plan con overflowx; público7etiquetas envueltas.
1280: métricas4columnas y títulos32px; selector hora/plan adaptado al ancho del padre.
Temas por tokens existentes; sidebar alumno usa el mismo panel oscuro del admin,
logo móvil/público según tema; reduced-motion y foco visible preservados.
Buildfrontendwebpack OK,33/33páginas, sin ejecutar pruebas ni arrancar servidores.
Primer build falló en hash de cachéwebpack; caché generada apartada en/tmp y segundo
build OK. Aviso heredado metadataBase fuera de alcance; no modificar layout para él.
Se excluyeron tests heredados/.claude temporalmente solo para typecheck/build;
tsconfig restaurado exactamente, sin diff. No modificados ni ejecutados tests.
Typecheck aplicación y lint en todas las carpetas afectadas OK,0errores/advertencias.
Anclas con subrayadoCSS: no se ocultan secciones ni se añade estado para pestañas.
No hubo capturas disponibles para cotejo; referencia fue el código deAlumnos.

Revisión manual pendiente, ambos temas y375/768/1280:
- Adminsolicitudes: carga/vacío/error, resumen, búsqueda/filtros/paginación, avatar
  y estado/48h; abrir/cerrar/teclado drawer, anclas, verificaciones/historial,
  certificado, consentimientos, aprobar/devolver/rechazar/confirmaciones/eliminar.
- Miinscripción: cargando/error/activa; Paso1verificaciones/documentos/exentos;
  Paso2controles/horas ocupadas/sincohorte/plan parcial/fijo/reservado; contador
  normal/5min/vencido/ampliar/liberar y confirmaciones; Paso3importe/checkout/
  pendiente/rechazo/revisión/aprobado/error. No cambiar pagos por probar diseño.
- Público: prechequeo, correo/código/reenvío, consentimiento, datos/representante,
  estudios/subida, revisión/faltantes/envío, seguimiento/devuelta/aprobada/rechazada
  y cerrado. Crearcontraseña: cargando/lista/errores/expirada/inválida/creada.
- Shellalumno: logo y navegación desktop/móvil, restringido/completo, tema y foco.
