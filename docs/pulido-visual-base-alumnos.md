# Pulido visual: base común y Alumnos

Fecha: 2026-10-16. Rama: feat/pulido-visual. Dos commits de implementación, sin push ni PR.

## Base común

El rojo de marca se conserva con relleno #C62828 y texto blanco (5.62:1). Los temas claro y oscuro usan superficies neutras sólidas, tipografía Inter, radios y espaciado compartidos. DESIGN.md documenta las decisiones actuales.

El contenedor limita el ancho y contiene el desplazamiento de las tablas. Se corrigió también el desbordamiento que provocaban etiquetas ocultas de las cabeceras. El sidebar tiene un icono por sección, usuario alineado al pie, correo truncado con tooltip y menú móvil accesible. Se añadió «Saltar al contenido».

Se incorporaron PageHeader, SearchInput, FilterChips, DataTable, EmptyState y Pagination. Se actualizaron botones, campos, tarjetas, badges y modal. Los botones mantienen al menos 40 px de altura (44 en móvil). El modal y el menú contienen el foco, lo devuelven al disparador y cierran con Escape. Los controles tienen foco visible y la carga/error se anuncia.

Cohortes, Instructores y Exámenes recibieron solo la adaptación de encabezado, márgenes, tabla y badges sustentados por datos. El login anuncia errores y usa un patrón decorativo local, sin referencia a la imagen ausente. ESLint excluye las herramientas del agente y artefactos locales para evitar analizar scripts externos como código React.

## Alumnos

El encabezado reúne contador real y acciones existentes. La búsqueda usa icono, limpieza y atajo /; conserva el debounce de 350 ms, el parámetro q y la exclusión de datos personales de las URL de navegación. Los cinco chips utilizan los filtros existentes. Curso empieza en «Todos los cursos», Cohorte depende del curso y el historial vive en «Más filtros». Los filtros activos se pueden quitar o limpiar.

La fila completa usa un enlace real a la ficha existente, admite teclado y nueva pestaña. Muestra iniciales, nombre en formato título, cédula, teléfono, vista previa de curso/cohorte, cuenta y pendientes. Se quitó la columna de matrículas coincidentes y el botón suelto. En móvil, la misma tabla se presenta como tarjetas; en tablet y escritorio conserva la tabla con desplazamiento interno cuando es necesario.

La carga usa skeleton. El vacío inicial ofrece matricular al primer alumno; la búsqueda sin coincidencias ofrece limpiar filtros; el error permite reintentar. La paginación usa singular/plural correcto. La ficha conserva su composición y utiliza la base compartida.

## Datos que no entrega el contrato

- No hay documentos pendientes por alumno en AdminStudent: se muestra «No informado» y se indica consultar la ficha. El filtro de documentos pendientes sí existe y se conserva.
- No hay un total de eliminaciones pendientes en el listado: el enlace permanece sin contador. No se añadió otra llamada a la API.
- matchingEnrollments no identifica una matrícula principal: se muestra la primera devuelta como vista previa y +N para las adicionales. No se deduce prioridad ni se reordena el dato.
- Cohort no incluye un estado: no se inventó un badge de estado. Instructores y Exámenes usan los booleanos reales de cuenta/publicación.

## Verificación

- Punto de partida del árbol de trabajo: 364 tests correctos.
- Base común: 365 tests correctos; lint y build correctos.
- Alumnos: 374 tests correctos en 49 archivos; lint y build correctos.
- Comprobación aislada de los commits, sin los cambios locales previos: 352 tests correctos en 48 archivos. No se instalaron dependencias para esta comprobación.
- 30 capturas por fase: cinco pantallas × dos temas × tres anchos (375, 768 y 1280 px). Después de los cambios: sin desbordamiento de página ni alertas de error dentro del contenido.
- Playwright confirmó: / enfoca el buscador; buscar sin resultados y limpiar funcionan; q no aparece en la URL de navegación; el filtro Activos conserva su parámetro; Curso parte en Todos; la ficha abre sin error; modal y menú contienen/devuelven el foco. No se guardaron formularios ni se modificaron registros.
- Contraste calculado desde los tokens efectivos: primario 5.62:1 en ambos temas; estados semánticos al menos 5.60:1 en claro y 7.52:1 en oscuro.
- Revisión de web-design-guidelines y checklist React sobre lo tocado: controles con etiquetas, enlaces reales, foco visible, estados anunciados, movimiento reducido, tablas contenidas y temas consistentes. El placeholder mantiene el texto exacto solicitado.

## Tests ajustados

Solo cambiaron expectativas visuales: elipsis de Cargando…, clases semánticas de badges, mayúsculas del nombre, Inactivo, resumen +N y texto del estado vacío. Se conservaron las comprobaciones de llamadas, filtros, paginación, enlaces y contratos. Se añadieron pruebas de foco del modal, atajo/limpieza de búsqueda, chips y singular/rango de paginación. Los tests previos del instructor quedaron fuera de los commits.

## Archivos tocados

- [.gitignore](../.gitignore)
- [DESIGN.md](../DESIGN.md)
- [app/(admin)/admin/cohorts/page.tsx](<../app/(admin)/admin/cohorts/page.tsx>)
- [app/(admin)/admin/exams/page.tsx](<../app/(admin)/admin/exams/page.tsx>)
- [app/(admin)/admin/instructors/page.tsx](<../app/(admin)/admin/instructors/page.tsx>)
- [app/(admin)/admin/students/StudentBadge.tsx](<../app/(admin)/admin/students/StudentBadge.tsx>)
- [app/(admin)/admin/students/StudentFilters.tsx](<../app/(admin)/admin/students/StudentFilters.tsx>)
- [app/(admin)/admin/students/StudentTable.tsx](<../app/(admin)/admin/students/StudentTable.tsx>)
- [app/(admin)/admin/students/page.tsx](<../app/(admin)/admin/students/page.tsx>)
- [app/(auth)/layout.tsx](<../app/(auth)/layout.tsx>)
- [app/(auth)/login/LoginForm.tsx](<../app/(auth)/login/LoginForm.tsx>)
- [app/globals.css](../app/globals.css)
- [components/layout/DashboardShell.tsx](../components/layout/DashboardShell.tsx)
- [components/layout/LoginHeroImage.tsx](../components/layout/LoginHeroImage.tsx)
- [components/layout/LogoutButton.tsx](../components/layout/LogoutButton.tsx)
- [components/layout/NavigationIcon.tsx](../components/layout/NavigationIcon.tsx)
- [components/layout/Sidebar.tsx](../components/layout/Sidebar.tsx)
- [components/theme/ThemeToggle.tsx](../components/theme/ThemeToggle.tsx)
- [components/ui/Button.tsx](../components/ui/Button.tsx)
- [components/ui/Card.tsx](../components/ui/Card.tsx)
- [components/ui/DataTable.tsx](../components/ui/DataTable.tsx)
- [components/ui/EmptyState.tsx](../components/ui/EmptyState.tsx)
- [components/ui/FilterChips.tsx](../components/ui/FilterChips.tsx)
- [components/ui/IconButton.tsx](../components/ui/IconButton.tsx)
- [components/ui/Input.tsx](../components/ui/Input.tsx)
- [components/ui/Modal.tsx](../components/ui/Modal.tsx)
- [components/ui/PageHeader.tsx](../components/ui/PageHeader.tsx)
- [components/ui/Pagination.tsx](../components/ui/Pagination.tsx)
- [components/ui/SearchInput.tsx](../components/ui/SearchInput.tsx)
- [components/ui/Select.tsx](../components/ui/Select.tsx)
- [components/ui/StatusBadge.tsx](../components/ui/StatusBadge.tsx)
- [components/ui/Textarea.tsx](../components/ui/Textarea.tsx)
- [components/ui/index.ts](../components/ui/index.ts)
- [docs/pulido-visual-base-alumnos.md](../docs/pulido-visual-base-alumnos.md)
- [eslint.config.mjs](../eslint.config.mjs)
- [hooks/useDialogFocus.ts](../hooks/useDialogFocus.ts)
- [tests/app/(admin)/admin/students/students.test.tsx](<../tests/app/(admin)/admin/students/students.test.tsx>)
- [tests/components/ui/Button.test.tsx](../tests/components/ui/Button.test.tsx)
- [tests/components/ui/Modal.test.tsx](../tests/components/ui/Modal.test.tsx)
- [tests/components/ui/Pagination.test.tsx](../tests/components/ui/Pagination.test.tsx)
- [tests/components/ui/SearchInput.test.tsx](../tests/components/ui/SearchInput.test.tsx)
- [tests/components/ui/StatusBadge.test.tsx](../tests/components/ui/StatusBadge.test.tsx)

## Capturas comparativas locales

Las capturas con datos reales están en .playwright-cli/visual/ y se mantienen fuera de los commits. La sesión manual se guardó/cargó con Playwright CLI en .local-auth/admin.json, excluido de Git; no se registraron credenciales de acceso.

### Alumnos

- Claro 375 px: [Antes](../.playwright-cli/visual/before/alumnos-light-375.png) · [Base común](../.playwright-cli/visual/base/alumnos-light-375.png) · [Resultado final](../.playwright-cli/visual/alumnos/alumnos-light-375.png).
- Claro 768 px: [Antes](../.playwright-cli/visual/before/alumnos-light-768.png) · [Base común](../.playwright-cli/visual/base/alumnos-light-768.png) · [Resultado final](../.playwright-cli/visual/alumnos/alumnos-light-768.png).
- Claro 1280 px: [Antes](../.playwright-cli/visual/before/alumnos-light-1280.png) · [Base común](../.playwright-cli/visual/base/alumnos-light-1280.png) · [Resultado final](../.playwright-cli/visual/alumnos/alumnos-light-1280.png).
- Oscuro 375 px: [Antes](../.playwright-cli/visual/before/alumnos-dark-375.png) · [Base común](../.playwright-cli/visual/base/alumnos-dark-375.png) · [Resultado final](../.playwright-cli/visual/alumnos/alumnos-dark-375.png).
- Oscuro 768 px: [Antes](../.playwright-cli/visual/before/alumnos-dark-768.png) · [Base común](../.playwright-cli/visual/base/alumnos-dark-768.png) · [Resultado final](../.playwright-cli/visual/alumnos/alumnos-dark-768.png).
- Oscuro 1280 px: [Antes](../.playwright-cli/visual/before/alumnos-dark-1280.png) · [Base común](../.playwright-cli/visual/base/alumnos-dark-1280.png) · [Resultado final](../.playwright-cli/visual/alumnos/alumnos-dark-1280.png).

### Cohortes

- Claro 375 px: [Antes](../.playwright-cli/visual/before/cohortes-light-375.png) · [Base común](../.playwright-cli/visual/base/cohortes-light-375.png) · [Resultado final](../.playwright-cli/visual/alumnos/cohortes-light-375.png).
- Claro 768 px: [Antes](../.playwright-cli/visual/before/cohortes-light-768.png) · [Base común](../.playwright-cli/visual/base/cohortes-light-768.png) · [Resultado final](../.playwright-cli/visual/alumnos/cohortes-light-768.png).
- Claro 1280 px: [Antes](../.playwright-cli/visual/before/cohortes-light-1280.png) · [Base común](../.playwright-cli/visual/base/cohortes-light-1280.png) · [Resultado final](../.playwright-cli/visual/alumnos/cohortes-light-1280.png).
- Oscuro 375 px: [Antes](../.playwright-cli/visual/before/cohortes-dark-375.png) · [Base común](../.playwright-cli/visual/base/cohortes-dark-375.png) · [Resultado final](../.playwright-cli/visual/alumnos/cohortes-dark-375.png).
- Oscuro 768 px: [Antes](../.playwright-cli/visual/before/cohortes-dark-768.png) · [Base común](../.playwright-cli/visual/base/cohortes-dark-768.png) · [Resultado final](../.playwright-cli/visual/alumnos/cohortes-dark-768.png).
- Oscuro 1280 px: [Antes](../.playwright-cli/visual/before/cohortes-dark-1280.png) · [Base común](../.playwright-cli/visual/base/cohortes-dark-1280.png) · [Resultado final](../.playwright-cli/visual/alumnos/cohortes-dark-1280.png).

### Instructores

- Claro 375 px: [Antes](../.playwright-cli/visual/before/instructores-light-375.png) · [Base común](../.playwright-cli/visual/base/instructores-light-375.png) · [Resultado final](../.playwright-cli/visual/alumnos/instructores-light-375.png).
- Claro 768 px: [Antes](../.playwright-cli/visual/before/instructores-light-768.png) · [Base común](../.playwright-cli/visual/base/instructores-light-768.png) · [Resultado final](../.playwright-cli/visual/alumnos/instructores-light-768.png).
- Claro 1280 px: [Antes](../.playwright-cli/visual/before/instructores-light-1280.png) · [Base común](../.playwright-cli/visual/base/instructores-light-1280.png) · [Resultado final](../.playwright-cli/visual/alumnos/instructores-light-1280.png).
- Oscuro 375 px: [Antes](../.playwright-cli/visual/before/instructores-dark-375.png) · [Base común](../.playwright-cli/visual/base/instructores-dark-375.png) · [Resultado final](../.playwright-cli/visual/alumnos/instructores-dark-375.png).
- Oscuro 768 px: [Antes](../.playwright-cli/visual/before/instructores-dark-768.png) · [Base común](../.playwright-cli/visual/base/instructores-dark-768.png) · [Resultado final](../.playwright-cli/visual/alumnos/instructores-dark-768.png).
- Oscuro 1280 px: [Antes](../.playwright-cli/visual/before/instructores-dark-1280.png) · [Base común](../.playwright-cli/visual/base/instructores-dark-1280.png) · [Resultado final](../.playwright-cli/visual/alumnos/instructores-dark-1280.png).

### Exámenes

- Claro 375 px: [Antes](../.playwright-cli/visual/before/examenes-light-375.png) · [Base común](../.playwright-cli/visual/base/examenes-light-375.png) · [Resultado final](../.playwright-cli/visual/alumnos/examenes-light-375.png).
- Claro 768 px: [Antes](../.playwright-cli/visual/before/examenes-light-768.png) · [Base común](../.playwright-cli/visual/base/examenes-light-768.png) · [Resultado final](../.playwright-cli/visual/alumnos/examenes-light-768.png).
- Claro 1280 px: [Antes](../.playwright-cli/visual/before/examenes-light-1280.png) · [Base común](../.playwright-cli/visual/base/examenes-light-1280.png) · [Resultado final](../.playwright-cli/visual/alumnos/examenes-light-1280.png).
- Oscuro 375 px: [Antes](../.playwright-cli/visual/before/examenes-dark-375.png) · [Base común](../.playwright-cli/visual/base/examenes-dark-375.png) · [Resultado final](../.playwright-cli/visual/alumnos/examenes-dark-375.png).
- Oscuro 768 px: [Antes](../.playwright-cli/visual/before/examenes-dark-768.png) · [Base común](../.playwright-cli/visual/base/examenes-dark-768.png) · [Resultado final](../.playwright-cli/visual/alumnos/examenes-dark-768.png).
- Oscuro 1280 px: [Antes](../.playwright-cli/visual/before/examenes-dark-1280.png) · [Base común](../.playwright-cli/visual/base/examenes-dark-1280.png) · [Resultado final](../.playwright-cli/visual/alumnos/examenes-dark-1280.png).

### Horarios

- Claro 375 px: [Antes](../.playwright-cli/visual/before/horarios-light-375.png) · [Base común](../.playwright-cli/visual/base/horarios-light-375.png) · [Resultado final](../.playwright-cli/visual/alumnos/horarios-light-375.png).
- Claro 768 px: [Antes](../.playwright-cli/visual/before/horarios-light-768.png) · [Base común](../.playwright-cli/visual/base/horarios-light-768.png) · [Resultado final](../.playwright-cli/visual/alumnos/horarios-light-768.png).
- Claro 1280 px: [Antes](../.playwright-cli/visual/before/horarios-light-1280.png) · [Base común](../.playwright-cli/visual/base/horarios-light-1280.png) · [Resultado final](../.playwright-cli/visual/alumnos/horarios-light-1280.png).
- Oscuro 375 px: [Antes](../.playwright-cli/visual/before/horarios-dark-375.png) · [Base común](../.playwright-cli/visual/base/horarios-dark-375.png) · [Resultado final](../.playwright-cli/visual/alumnos/horarios-dark-375.png).
- Oscuro 768 px: [Antes](../.playwright-cli/visual/before/horarios-dark-768.png) · [Base común](../.playwright-cli/visual/base/horarios-dark-768.png) · [Resultado final](../.playwright-cli/visual/alumnos/horarios-dark-768.png).
- Oscuro 1280 px: [Antes](../.playwright-cli/visual/before/horarios-dark-1280.png) · [Base común](../.playwright-cli/visual/base/horarios-dark-1280.png) · [Resultado final](../.playwright-cli/visual/alumnos/horarios-dark-1280.png).

Otras evidencias: [sin resultados](../.playwright-cli/visual/alumnos/sin-resultados-375.png), [ficha](../.playwright-cli/visual/alumnos/ficha-1280.png), [modal](../.playwright-cli/visual/alumnos/modal-375.png) y [menú móvil](../.playwright-cli/visual/alumnos/menu-375.png).
