# Auditoría visual inicial

Fecha: 2026-10-16  
Rama: `feat/pulido-visual`  
Alcance: revisión estática del frontend y capturas headless. No se modificó código de la aplicación.

## Hallazgos

- **Guía visual:** `DESIGN.md` define un canvas oscuro, un acento lavanda y superficies planas con bordes sutiles. `app/globals.css` todavía aplica modo claro/oscuro, acentos rojo y azul, gradientes y tarjetas translúcidas. La base visual no sigue la guía.
- **Contraste:** el texto blanco sobre el botón primario `#e13b3b` alcanza aproximadamente 4.29:1, por debajo de 4.5:1 para texto normal.
- **Foco y diálogos:** los campos conservan un anillo visible, aunque usan `:focus` en vez de `:focus-visible`. `Modal` declara `aria-modal`, pero no contiene ni devuelve el foco al cerrarse; su botón de cierre no define estilo de foco.
- **Formularios:** el login tiene etiquetas, nombres, tipos y `autocomplete` adecuados. Su mensaje de error no usa `role="alert"` ni `aria-live`, por lo que puede no anunciarse al enviarlo.
- **Estados:** hay mensajes de carga y estados vacíos en las pantallas revisadas, pero varios mensajes de carga no tienen `role="status"` (por ejemplo, estudiantes, cohortes y agenda del alumno). La presentación visual de carga/error varía entre módulos.
- **Adaptación:** las tablas usan contenedores con desplazamiento horizontal. Los botones de tamaño pequeño miden 32 px de alto; revisar su uso en móvil frente a los objetivos táctiles.
- **Login:** `/images/login-hero.jpg` no existe en `public/`; el servidor responde 404 y, desde 768 px, queda el degradado de respaldo sin imagen.
- **Navegación:** `DashboardShell` incluye `<main>`, pero no se encontró un enlace para saltar directamente al contenido.

## Capturas

El login se capturó a 375, 768 y 1280 px. Las rutas `/admin/students`, `/student` y `/instructor` redirigieron a `/login` en los tres anchos porque no había una sesión autenticada disponible. Sus capturas documentan esa redirección y no representan el contenido de los paneles.

- Login: `login-375.png`, `login-768.png`, `login-1280.png`
- Admin / estudiantes: `admin-students-375.png`, `admin-students-768.png`, `admin-students-1280.png`
- Estudiante: `student-375.png`, `student-768.png`, `student-1280.png`
- Instructor: `instructor-375.png`, `instructor-768.png`, `instructor-1280.png`

Todos los archivos están en `.playwright-cli/audit/`.

## Validación

Tests, lint y build no ejecutados: esta etapa fue de auditoría, sin cambios de código.

Referencia: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).
