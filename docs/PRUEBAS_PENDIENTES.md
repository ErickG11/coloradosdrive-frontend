# Pruebas pendientes — alcance acordado

Actualizado por instrucción del dueño durante el cierre del lote 1 (2026-11-12).
Solo se ejecutan tipos y pruebas obligatorias del lote/grupo autorizado. No añadir
skips ni rebajar una aserción obligatoria; ante fallo obligatorio, informar y detener.
Las suites preexistentes se conservan, pero no se ejecutan indiscriminadamente.

## Aprobaciones y pruebas que NO se difieren

Orden actual: lote 1 aprobado; **lotes 2–11 autorizados en pasada continua**. Esta instrucción sustituye las paradas por grupos. Avanzar únicamente cuando pasan las pruebas obligatorias del lote actual.

| Lote/grupo | Pruebas obligatorias conservadas |
| --- | --- |
| 1 | Preflight; instalación limpia; actualización con fixtures; backfill con conteos, importes, relaciones y procedencia; rollback; manifiesto F45; tipos |
| 2+3 | 23:59:59/00:00; 12 duraciones en UNA prueba parametrizada con los mismos vectores TS/SQL; hoy con franjas futuras; cambio de mes/año; reserva todo o nada y última franja ocupada; último recurso con dos conexiones reales; pago incierto retenido; 23:55/00:05; precio capturado; cupo por intervalo sin duplicar; webhook duplicado; ninguna respuesta de alumno con nombre/código de cohorte |
| 4+5 | Matrícula única por tipo con dos pestañas; A+B simultáneos; acceso por fechas propias; rechazo directo de RPC sin permiso SQL/RLS; mantener privacidad de respuestas al alumno |
| 6+7 | Cambio conserva origen ante fallo/vencimiento; reasignación masiva todo o nada; cancelación con matriculados bloqueada; mantener restricciones SQL/RLS aplicables |
| 8+9+10 | Factura única por pago y matrícula intacta ante fallo de emisión; revisores concurrentes; ambas revocaciones; presencial sin escaneo; retención por defecto; cédula/pasaporte con mismo número sin colisión |
| 11 | Integración final de invariantes; lint/build completos y chequeos previos a integrar |

## Automatización diferida

No escribir ni ejecutar estas pruebas en los lotes actuales. La columna de lote
identifica la funcionalidad propietaria. Su automatización se revisará en el cierre
del lote 11/antes de integrar, o con autorización expresa anterior. La guía manual
de cada grupo sí debe cubrir los controles afectados con datos, pasos, esperado y reset.

| Prueba diferida | Lote funcional | Riesgo que cubriría | Estado |
| --- | --- | --- | --- |
| Componentes de calendario y presentación de las 12 duraciones | 2+3 | UI que muestra fechas/horas diferentes del constructor obligatorio | Pendiente; las 12 reglas puras NO se difieren |
| Estados visuales de reserva y aviso a dos minutos | 3 | Contador/aviso desincronizado o mensaje incorrecto | QA manual al entregar grupo; automatización diferida |
| Formularios, ayuda de extensión, errores y filtros de cohortes | 4 | Validación o disponibilidad visual distinta del backend | QA manual por grupo |
| Panel del alumno con A/B, acceso y fechas individuales | 5 | Confundir inscripción pendiente con acceso pagado de otro tipo | QA manual; regla de acceso obligatoria en SQL/servicio |
| Botón WhatsApp: configuración, mensaje y codificación | 6 | Enlace equivocado, ausencia de configuración o exposición de datos | QA manual |
| Diálogo de interesados, filtros y contadores visuales | 6 | Mostrar N incorrecto o diálogo cuando N=0 | QA manual; no sustituye invariantes de datos |
| Pantallas de cambio/reasignación, confirmaciones y accesibilidad | 7 | Pérdida de contexto, confirmación errónea o teclado inaccesible | QA manual; atomicidad NO se difiere |
| Formularios de pagador/factura, estados pendientes y acciones administrativas | 8 | UI que confunde pago con emisión o datos del alumno con los del pagador | QA manual; idempotencia/emisión fallida NO se difieren |
| Pantallas de revisión, archivo, revocación y subida de escaneo | 9 | Estado visual o mensajes distintos de las decisiones persistidas | QA manual; invariantes de verificación NO se difieren |
| Formulario de tipo/número de documento extranjero | 10 | Errores visuales de selección/validación por tipo | QA manual; unicidad por tipo/número NO se difiere |
| Métricas del embudo: series, agrupación y representación | 1 y transversal (R15) | Eventos incompletos, duplicados o interpretación errónea del embudo | Pendiente del cierre transversal; indicadores apagados en lote 1 |
| Combinaciones exhaustivas adicionales | 2–10 | Interacciones de casos secundarios no cubiertos por vectores obligatorios | Diferidas; no incluye ninguna prueba obligatoria |
| Cobertura de código global | 11 | Huecos no identificados en áreas no ejercitadas | Diferida; no imponer porcentaje sustituyendo invariantes |
| Recorrido completo extremo a extremo | 11 | Integración Auth/API/UI/pagos/factura y recuperación entre módulos | Diferido; solo entorno local/aislado autorizado |
| Lint/build completos de ambos repositorios | 11 y antes de integrar | Errores globales de compilación/estilo fuera del cambio focal | No repetir por lote |
| Regresión amplia preexistente fuera de obligaciones del grupo | 11 | Efectos laterales en módulos ajenos | Conservar sin nuevas ejecuciones por lote |
| TS2835 en tests/unit/cors.test.ts:43 | 11 | Impide typecheck backend de todos los tests con NodeNext | Reproducido también en bcceca93; archivo no modificado |
| Suite HTTP global bajo sandbox | 11 | Puertos locales bloqueados impiden ejecutar ciertos tests HTTP | Intento preliminar encontró EPERM; no añadir skips |

Las dos pruebas de objetos de contrato frontend creadas inicialmente en lote 1
se retiraron tras el ajuste: eran redundantes con el chequeo de tipos. Sus ejecuciones
previas no se contabilizan como pruebas mantenidas. No son dos skips nuevos.

## Nueve pruebas frontend omitidas preexistentes

No se reactivan, reescriben ni ejecutan ahora. Pertenecen al lote 9 de funcionalidad;
su reactivación queda pendiente del cierre autorizado. Se conserva su estado original.

| Archivo / caso | Lote | Riesgo |
| --- | --- | --- |
| DocumentReviewAfterApproval: revisión documental después de aprobar | 9 | Expediente archivado que pierde revisión de documentos |
| SolicitudesAdmin: mantener panel al salir del filtro | 9 | Pérdida de resultado/contexto tras decisión |
| SolicitudesAdmin: actualización por decisión en otra pestaña | 9 | Panel desactualizado ante revisión concurrente |
| SolicitudDetail: cierre, restauración de foco y fondo | 9 | Bloqueo de navegación/accesibilidad |
| SolicitudDetail: trampa de foco en ambas direcciones | 9 | Navegación por teclado fuera del diálogo |
| SolicitudDetail: acciones documentales | 9 | Botones/estado documental inconsistentes |
| SolicitudDetail: rechazo inline con motivo | 9 | Acciones posteriores a rechazo o motivo no presentado |
| SolicitudDetail: conservar resultado y solo lectura | 9 | Nueva decisión indebida sobre solicitud resuelta |
| SolicitudDetail: separar decisión de solicitud y revisión documental | 9 | Bloquear revisión documental que debe seguir disponible |

## Guías y restablecimiento

[Guion y QA del lote 1](operations/cohortes-lote1.md) y
[resultados reales](operations/cohortes-lote1-resultados.md).
Los grupos futuros añadirán guía manual antes de su entrega. Nunca se marcará
una prueba manual como ejecutada sin haberla realizado.

## Autorización posterior de pasada continua

Lotes 2 al 11 autorizados sin paradas por grupos. Esta instrucción sustituye la
agrupación anterior. Mantener solo pruebas obligatorias y tipos; no activar indicadores.

Lote 4: automatización de formulario (código/estado/cierre, habilitación, motivo, solo lectura, ayuda de extensión, edición de precios y flota) diferida; riesgo de interacción, accesibilidad y recarga visual cubierto por la guía QA manual del lote 4.

Lote 5: pruebas de componentes del selector A/B, cambio con respuestas tardías, extensión individual y excepción de repetición diferidas. Riesgo: selección visual incorrecta o mensaje no anunciado. Guía manual en operations/cohortes-lote5.md.

Lote 6: automatización de Avísame/WhatsApp, filtro y contadores, diálogo N=0/N>0 y reintento de correo diferida; riesgo de interacción, codificación, foco y presentación de entrega frente a cola. Guía manual en operations/cohortes-lote6.md.

Lote 7: componentes de calendario/cambio individual, contador de propuesta, selección masiva/destino, confirmación de capacidad, cancelación y mensajes/foco diferidos; guía manual en operations/cohortes-lote7.md. Atomicidad y conservación del original verificadas en SQL.

Lote 8: formularios del pagador, estado fiscal, registro de autorización existente, reintento y devolución documentada en ficha: componentes/accesibilidad diferidos; riesgo de interpretar cola como emisión o reembolso; QA manual en operations/cohortes-lote8.md.

Lote 9: UI de reclamación/renovación, modo/escaneo, archivo, revocación confirmada, correo en cola/reintento, retención y columna de pago diferidas; riesgos de interacción, foco y presentación. QA manual en operations/cohortes-lote9.md. Nueve pruebas omitidas preexistentes intactas.

Lote 10: selectores de documento y representante, contacto según capacidad, resumen, búsquedas/listas y lectores tipados: UI/accesibilidad diferidas; riesgo de etiqueta incorrecta o progreso perdido. QA manual en operations/cohortes-lote10.md; unicidad y flujo de datos/aprobación verificados en SQL.

## Instrucción posterior de cierre L11/L12

No escribir ni ejecutar pruebas automáticas, lint o build. Única excepción al final: tipos en ambos repos y una instalación local completa 001–última con las verificaciones existentes; corregir y repetir solo el fallo. Privacidad, permisos, catálogo, concurrencia y QA de componentes de la punta final permanecen pendientes. No añadir skips. Las guías de cada lote se conservan; no se crea guía consolidada nueva.

## CD-346 · Exportar reportes (RF-08)

Automatizadas: `tests/lib/api/reports.test.ts` y `tests/components/reports/ReportExport.test.tsx` (estados, errores, filtros enviados, rol, teclado). No sustituyen las pruebas manuales de abajo, que dependen del navegador real.

### Guía de prueba manual del frontend (pendiente de ejecutar)

Preparación: frontend y backend corriendo con datos de demostración; sesión de administrador (y una de instructor y otra de alumno). Pantalla: `/admin`, sección «Exportar reportes» bajo el resumen.

| N.º | Paso | Resultado esperado |
| --- | --- | --- |
| 1 | Entrar como instructor y como alumno | La sección «Exportar reportes» no aparece; el ranking de instructores tampoco |
| 2 | Entrar como administrador | Aparece la sección con Desde, Hasta, Tipo de curso, Cohorte y Reporte; el período es el mes en curso |
| 3 | Para cada reporte (matrículas, asistencia, exámenes, finanzas, instructores, todos): Exportar → PDF | Toast verde «Reporte descargado»; el archivo se descarga con nombre `reporte-<tipo>-<desde>_<hasta>.pdf` |
| 4 | Lo mismo con Excel | Descarga `.xlsx` con una hoja por reporte |
| 5 | Cambiar fechas, tipo de curso y cohorte y exportar | El resumen de filtros junto al botón coincide; el documento muestra los mismos filtros |
| 6 | Elegir Tipo B y mirar el selector de cohortes | Solo aparecen cohortes tipo B; una cohorte tipo A elegida antes se limpia |
| 7 | Poner «Desde» posterior a «Hasta» | Error junto al campo; al exportar aparece «Corrige las fechas antes de exportar.» y no se descarga nada |
| 8 | Poner un rango de más de 366 días | Error junto a «Hasta» |
| 9 | Período sin datos (por ejemplo, enero de 2020) | El PDF y el Excel dicen «Sin datos para el período seleccionado» |
| 10 | Abrir el Excel y comparar con el PDF y con el panel `/admin` | Mismas cifras; en Excel las cifras son números con formato de moneda y de porcentaje |
| 11 | En Excel: congelar paneles, filtro automático y totales | Encabezado fijo, filtro en la fila de títulos, fila de totales |
| 12 | Hacer doble clic rápido en «Exportar» y elegir un formato | Una sola descarga; el botón queda deshabilitado y dice «Generando…» |
| 13 | Exportar más de 20 veces seguidas | Aviso «Hiciste demasiadas exportaciones…» sin toast verde |
| 14 | Quitar la red o apagar el backend y exportar | Aviso en español; la pantalla sigue usable |
| 15 | Con la sesión expirada, exportar | Aviso «Tu sesión expiró…» |
| 16 | Con `ADMIN_MFA_REQUIRED=true` y sesión sin segundo factor | Redirige al desafío de segundo factor |
| 17 | En Safari de iOS y en Chrome de Android: exportar PDF y Excel | Se descarga, o aparece el enlace «Abrir …» y funciona |
| 18 | Probar con 375, 768 y 1440 px de ancho | Sin desplazamiento horizontal; el botón ocupa todo el ancho en móvil; filtros en 1, 2 y 5 columnas |
| 19 | Probar modo claro y modo oscuro | Textos legibles, errores y foco visibles en ambos |
| 20 | Usar solo teclado: Tab hasta «Exportar», flecha abajo, flechas, Escape, Enter | El menú se abre, se recorre, se cierra con Escape devolviendo el foco, y Enter descarga |
| 21 | Con un lector de pantalla | Se anuncia «Generando el reporte…» y los errores |

## CD-364 · Agenda del instructor y asistencias por bloques

Rama `integracion/cierre-sprint-6`. Antes de probar, el backend de la misma rama debe estar levantado. Prepara un instructor con franjas confirmadas esta semana (algunas ya terminadas), un alumno con cohorte de tipo A y otro de tipo B, y un administrador. Cada paso se prueba con 375, 768 y 1440 px de ancho y en modo claro y oscuro (pasos 21 y 22).

### Guía de prueba manual (pendiente de ejecutar)

| # | Acción | Resultado esperado |
| --- | --- | --- |
| 1 | Entrar como instructor y abrir «Mi agenda» en 1440 px | Se abre en vista **Semana**, con las horas del día en filas, la hora actual marcada y la siguiente práctica destacada con su cuenta regresiva |
| 2 | Abrir la misma pantalla en 375 px | Se abre en vista **Día**; hay un selector L M X J V S D y se puede pasar a Semana sin esperar una carga nueva |
| 3 | Revisar una franja con alumno | Muestra curso (A o B) y cohorte; una franja libre no muestra datos de alumno |
| 4 | Hacer clic en un bloque | Se abre el detalle con alumno, cohorte y horas; Escape lo cierra y devuelve el foco al bloque |
| 5 | Navegar a la semana anterior y siguiente, y pulsar «Hoy» | Cambia la semana, se conserva el día de la semana y vuelve a hoy |
| 6 | Revisar el resumen de la parte superior | Cuenta horas y alumnos distintos de hoy y de la semana; una hora pendiente de asistencia aparece en el aviso |
| 7 | Pulsar el aviso de horas pendientes | Abre «Asistencias» con el rango de la semana |
| 8 | En «Asistencias» registrar una hora **terminada** como Asistió y otra como Faltó | Se guarda, aparece el mensaje de éxito en verde y las horas pasan a la pestaña de registradas |
| 9 | Intentar registrar una hora que **no ha terminado** | No hay botón para guardar y se explica que aún no está completada |
| 10 | Registrar un bloque de dos horas | Se registran las dos horas y el resumen del bloque se actualiza |
| 11 | Intentar corregir una hora ya registrada | Pide un motivo de 10 a 500 caracteres; con el motivo se guarda. Si la ventana ya cerró, indica que pida la corrección al administrador |
| 12 | Provocar un error (apagar el backend) y reintentar | El error se muestra, el diálogo y el motivo se conservan y se puede reintentar |
| 13 | Como administrador, cambiar el horario de una franja con instructor asignado | El instructor recibe el aviso; al pulsarlo «Mi agenda» abre el **día afectado** (parámetro `fecha`) |
| 14 | Con la agenda abierta, llegar un aviso para otro día | La agenda cambia al día del aviso sin recargar la página |
| 15 | Abrir el menú del instructor | Tiene «Mi agenda», «Asistencias» y «Cambiar contraseña» como en los demás roles; «Cambiar contraseña» abre la pantalla y cambia la clave |
| 16 | Apagar solo la consulta de bloques (simulando un error 500 en `/practice-slots/blocks/instructor-groups`) | Las franjas se muestran una por hora y aparece el aviso de bloques no disponibles |
| 17 | Abrir una franja con alumno proveniente de solicitud | **No hay** ningún control para confirmar la cédula original (ADR 026 del backend) |
| 18 | Como alumno con solicitud, abrir «Documentos» y el estado de inscripción | Los textos dicen que la escuela verificará la cédula, no el instructor |
| 19 | Como administrador, abrir la ficha de un alumno de solicitud | Sigue existiendo «Confirmar identidad manualmente» (con motivo; solo permitido 48 horas después de una práctica, ver pendientes) |
| 20 | No regresión: Panel del administrador (exportar un reporte), cohortes, estudiantes y Mi panel del alumno | Siguen abriendo y funcionando igual |
| 21 | Repetir los pasos 1, 2, 4, 8 y 15 en modo oscuro | Textos legibles, foco y errores visibles; la línea de «ahora» se distingue |
| 22 | Repetir en 375, 768 y 1440 px | Sin desplazamiento horizontal de la página; el calendario semanal se desplaza dentro de su propio contenedor; objetivos táctiles cómodos |
| 23 | Usar solo teclado: Tab por la agenda, Enter en un bloque, Escape, Tab hasta los botones de asistencia | El orden de foco es lógico, el foco es visible y Escape cierra el detalle y el diálogo |
| 24 | Con un lector de pantalla en «Asistencias» | Se anuncia el resultado del guardado y los errores |

## Guía manual — cierre de Sprint 6 (rama `feat/cierre-sprint-6-ajustes`)

Requisito previo: migración 095 aplicada en Supabase y backend desplegado con ella.

| # | Paso | Esperado |
| --- | --- | --- |
| 1 | Como administrador, abrir la ficha de un alumno sin identidad confirmada, con su inscripción creada por solicitud, y pulsar «Confirmar identidad manualmente» | Se confirma de inmediato, sin esperar a una práctica; la observación es opcional y aparece un aviso verde «La identidad presencial se confirmó correctamente.» |
| 2 | Repetir con una observación de 5 caracteres | Mensaje «La observación debe tener entre 10 y 300 caracteres.» y no se confirma |
| 3 | Pulsar de nuevo en el mismo alumno | No falla ni duplica: sigue confirmada |
| 4 | Como alumno con la identidad pendiente, abrir «Documentos para llevar» | Los textos hablan de «la escuela»; ningún texto menciona al instructor ni un plazo de 48 horas |
| 5 | Crear una cohorte | Aparece un aviso verde en la esquina inferior, se cierra solo a los 5 s, se puede cerrar con la X y con Escape, y se detiene al pasar el ratón |
| 6 | Guardar cambios de una cohorte, cancelar una cohorte y eliminar una cohorte | Cada acción muestra su aviso verde; tras cancelar, el foco queda en el resumen de la lista |
| 7 | Eliminar un alumno definitivamente | Se vuelve al listado y aparece el aviso «El alumno se eliminó definitivamente.»; la URL no lleva `?aviso=` |
| 8 | Crear y editar un instructor; restablecer su contraseña | Un aviso verde por acción |
| 9 | Crear, editar y eliminar una franja de práctica | Un aviso verde por acción |
| 10 | Aprobar, devolver y rechazar una solicitud de inscripción | Un aviso verde por acción |
| 11 | Como alumno, confirmar asistencia a un bloque, avisar una falta y tomar un cupo | Un aviso verde por acción |
| 12 | Provocar un error (por ejemplo, correo ya registrado al crear un instructor) | No aparece aviso verde; el error se ve en rojo junto al formulario |
| 13 | Con el lector de pantalla o la prueba de «reducir movimiento» activada | El aviso se anuncia con cortesía y sin animación |
| 14 | Matrícula manual, paso 1, estudiante nuevo: elegir en el calendario una fecha de hace 5 años | El calendario deja elegirla; al pulsar Continuar aparece «La edad mínima para registrar a un estudiante es de 15 años.» junto al campo |
| 15 | Misma pantalla con una fecha de hace exactamente 15 años (hoy) | Avanza |
| 16 | Teléfono «abc» | Mensaje junto al campo; con «0991234567» o «+593 99 123 4567» avanza |
| 17 | Cédula y correo de un alumno ya registrado | Un solo clic en Continuar marca ambos campos y no avanza |
| 18 | Cédula y correo nuevos con datos válidos | Avanza al paso 2 |
| 19 | Revisar en un teléfono (360 px) un aviso verde largo | No tapa el botón principal ni desborda la pantalla |

Reset: eliminar los registros de prueba desde la ficha del alumno y desde Instructores.

