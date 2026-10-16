# ColoradosDrive — guía de interfaz

Adaptación de la estructura sobria de Linear a una plataforma de escuela de conducción. ColoradosDrive conserva su marca roja y sus temas claro y oscuro. Estas decisiones sustituyen el acento lavanda y las reglas exclusivas de la página comercial de referencia.

## Principios

- Densidad útil: encabezados breves, controles compactos y tablas fáciles de recorrer.
- Superficies neutras y sólidas; jerarquía mediante tono, espacio y bordes discretos.
- Rojo solo en acción principal, navegación activa, errores y acciones destructivas.
- Cada estado lleva texto; nunca se comunica solo por color.
- Los contadores y estados siempre proceden de datos reales.
- Se conservan contratos, permisos, rutas y reglas de negocio.

## Tokens

Todos los tokens de color, tipografía, espacio, radios, sombras y ancho de contenido se definen en `app/globals.css`. Los componentes consumen los tokens semánticos de Tailwind.

- Primario: `#C62828`, texto blanco (contraste aproximado 5.62:1); hover `#AD2020`; presionado `#941B1B`.
- Claro: canvas `#F7F8FA`, superficie `#FFFFFF`, zona hundida `#F0F2F5`, texto principal `#18202B`, secundario `#566171`.
- Oscuro: canvas `#101114`, superficie `#181A1F`, elevada `#202329`, zona hundida `#22252C`, texto principal `#F2F3F5`, secundario `#AFB6C2`.
- El texto de error y enlace rojo usa un tono más claro en oscuro; los botones mantienen relleno oscuro y texto blanco.
- Bordes grises neutros. Gradiente de fondo casi imperceptible; sin manchas luminosas ni vidrio en el panel.
- Unidad base: 4 px; escala 4, 8, 12, 16, 24, 32 y 48 px.
- Contenido: máximo 1280 px; padding 16 px móvil, 24 px tablet y 32 px escritorio.
- Radio: 8 px controles, 12 px tarjetas/tablas y 16 px diálogos.
- Sombras sutiles en superficies elevadas y diálogos.

## Estados semánticos

Cada variante tiene tokens de fondo y texto para ambos temas.

- Éxito, Activo, Confirmado, Completado: verde.
- Inactivo, Desactivado, Sin datos: gris.
- Pendiente, Sin cohorte, Borrador: ámbar.
- Error, Rechazado, destructivo: rojo.
- Información sin resultado definitivo: neutro.

Los estados de prácticas conservan sus etiquetas y significado existentes. No se deriva un nuevo estado de fechas o campos ausentes.

## Tipografía

Inter existente para el panel: 400 cuerpo, 500 controles y 600 títulos. La marca conserva su forma actual. Sin fuentes ni dependencias nuevas.

- Página: 24 px, peso 600, espaciado ligeramente cerrado.
- Sección: 18–20 px, peso 600.
- Cuerpo y controles: 14–16 px, interlineado 1.5.
- Metadatos y badges: 12–13 px.
- Cifras alineadas con números tabulares. Títulos equilibrados y texto largo sin expandir el layout.

## Componentes

- `PageHeader`: título, contador/subtítulo y acciones. Contador solo con total real.
- `Button`: primario, secundario, fantasma y destructivo; mínimo 40 px de alto, 44 px en móvil. Iconos: 44 × 44 px. Carga anunciada y spinner.
- `SearchInput`: icono, etiqueta accesible, limpieza y atajo opcional `/`. Respeta búsqueda existente y evita datos personales en URL.
- `FilterChips`: filtros rápidos y removibles; selección indicada por superficie, borde, texto y `aria-pressed`.
- `StatusBadge`: color semántico con texto. Una cuenta inactiva se presenta en gris.
- `DataTable`: cabecera, filas, skeleton, vacío y error con reintento. Filas navegables con enlaces reales y foco visible. Alumnos se presenta como tarjetas en móvil.
- `Pagination`: singular/plural y rango real: «1 alumno», «Mostrando 1–20 de 135 alumnos».
- `EmptyState`: explica vacío o fallo y ofrece una acción pertinente.
- `Modal`: nombre accesible, foco contenido, retorno al disparador, Escape y desplazamiento interno.

## Layout y adaptación

- Sidebar desde 768 px y menú desplegable accesible en móvil.
- Icono distinto por sección. Usuario al pie: iniciales, correo truncado con tooltip y rol.
- Enlace «Saltar al contenido» para teclado.
- Hijos flex y tablas con `min-width: 0`; scroll horizontal contenido en la tabla.
- Verificar 375, 768 y 1280 px en claro y oscuro.
- Filtros secundarios desplegables y acciones ajustadas al ancho en móvil.
- Separación entre bloques de 24 px; entre controles, 8–12 px.

## Accesibilidad y estados

- Todos los controles tienen anillo visible con `:focus-visible`.
- Etiquetas asociadas, tipos adecuados, `autocomplete` y nombres de campo.
- Errores asíncronos con `role="alert"`; carga y confirmación con `role="status"`.
- Listados con carga, vacío, filtros sin resultados y error.
- Movimiento reducido; el contenido nunca depende de animaciones.
- Contraste mínimo 4.5:1 para texto normal y 3:1 para texto grande y componentes pertinentes.

## Verificación

Tras cada entrega: Playwright CLI, ambos temas y tres anchos, tests, lint, build y `web-design-guidelines` sobre lo tocado. Los estados de autenticación solo se guardan en `.local-auth/`, excluido de Git.
