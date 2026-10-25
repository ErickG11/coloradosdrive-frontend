---
version: 1
slug: "app-admin-admin-enrollments-page-tsx"
primary_target: "app/(admin)/admin/enrollments/page.tsx"
related_targets: ["app/(admin)/admin/enrollments/wizard/EnrollmentWizard.tsx", "app/(admin)/admin/enrollments/wizard/WizardProgress.tsx", "app/(admin)/admin/enrollments/wizard/WizardVisual.tsx", "app/(admin)/admin/enrollments/wizard/StepDatosEstudiante.tsx", "app/(admin)/admin/enrollments/wizard/StepCurso.tsx", "app/(admin)/admin/enrollments/wizard/StepPracticas.tsx", "app/(admin)/admin/enrollments/wizard/StepDocumentosPago.tsx", "app/(admin)/admin/enrollments/wizard/StepConfirmar.tsx", "app/(admin)/admin/enrollments/wizard/enrollment.module.css"]
---
# Matricular estudiante

Modo Operate, code-first, extensión del sistema administrativo aprobado. Cinco pasos y composición funcional fijados por el usuario; no se propone un nuevo mundo ni un flujo distinto. No hay una imagen específica de matrícula. Cohortes, Alumnos e Instructores constituyen la referencia de identidad.

## Direction contract

THESIS: Preparar y revisar la matrícula mediante los cinco pasos existentes, con una jerarquía clara y estados que eviten confundir borrador con confirmación.
OWN-WORLD: Carbón frío #0c1117/#111820/#1a222d y texto #f5f6fa/#bbc6d5 heredados; bordes #26313e, Inter, rojo intencional y estados con texto. Tema claro mediante tokens existentes. Sidebar local de 218 px sin modificar su componente. Contenido máximo de 1240 px, campos 44 px, metadatos mínimos 12 px.
FIRST VIEWPORT: Cabecera de 34 px y subtítulo factual, stepper en superficie independiente y un espacio de trabajo con título de paso. Indicadores numerados con activo rojo y completados verdes conectados; no son controles de navegación. Móvil muestra además el paso actual y abrevia visualmente Documentos y pago sin perder su etiqueta accesible.
STORY: Estudiante nuevo/existente con control segmentado; campos en dos columnas, selección real de cursos A/B, disponibilidad de cohorte, planificación en tres columnas, documentos y pago en columnas independientes y revisión en cuatro bloques. Tablet reduce columnas, móvil presenta todos los campos en orden de lectura y conserva todos los botones.
FORM: Estados, funciones, validaciones y atributos funcionales originales conservados. EnrollmentWizard mantiene payload, Idempotency-Key, almacenamiento de confirmación, recuperación de operación incierta, reenvío y bloqueo de navegación. payment.ts y wizardTypes.ts intactos. No se cambia la regla de no_aplica, cupo, edad, abono, precio pendiente ni la sugerencia de prácticas. Las vistas muestran los cálculos existentes, no valores fabricados.
SIGNATURE: Entrada de paso con opacidad y desplazamiento de 5 px, 200 ms; conectores con scaleX de 220 ms y controles de 140–160 ms. Sin retrasar acciones y con prefers-reduced-motion. Los cambios de paso siguen ejecutando los callbacks y setStep originales.
QUALITY BAR: Inspeccionar los cinco pasos en 375/768/1280 px y ambos temas, además del ancho de escritorio visto durante la revisión. Revisar estudiante nuevo/existente, errores, campos opcionales, curso sin cohorte/con cohorte, práctica automática/manual, documentos/pagos, navegación atrás, confirmación y recuperación idempotente. QA de escrituras y estados no disponibles mediante interceptación explícita: nunca crear matrícula ni enviar correo real. Sin tests de suite ni edición de tests; lint/build y comprobación de navegador. Sin dependencias, backend, permisos, autenticación ni módulos vecinos modificados.
