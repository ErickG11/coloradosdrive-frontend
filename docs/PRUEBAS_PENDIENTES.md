# Pruebas pendientes frontend

Alcance ajustado por el dueño durante lote 1: solo tipos y pruebas obligatorias del
grupo autorizado. No ejecutar componentes/UI, cobertura, regresión exhaustiva ni
lint/build completos por lote. No añadir skips. Lotes 2–11 autorizados en pasada continua.

Registro general con pruebas obligatorias, riesgos y lotes:
[PRUEBAS_PENDIENTES backend](../../coloradosdrive-backend/docs/PRUEBAS_PENDIENTES.md).

| Automatización diferida | Lote funcional | Riesgo que cubre |
| --- | --- | --- |
| Calendario y tabla visual de 12 combinaciones | 2+3 | Diferencia visual frente al constructor único; sus vectores puros sí son obligatorios |
| Aviso de reserva a dos minutos | 3 | Aviso/contador desincronizado |
| Formularios, filtros y ayuda de cohortes | 4 | Estado visual distinto del servidor |
| Contexto A/B, fechas y acceso del alumno | 5 | Bloqueo o presentación cruzada entre tipos |
| WhatsApp configurado, mensaje y codificación | 6 | Enlace erróneo o ausencia de configuración |
| Diálogos y contadores de espera | 6 | N incorrecto o diálogo sin interesados |
| Cambio/reasignación: controles y accesibilidad | 7 | Confirmaciones confusas, teclado/foco incorrectos |
| Datos del pagador y factura pendiente | 8 | UI que confunde matrícula pagada con factura emitida |
| Revisión, archivo, revocación y escaneo | 9 | Formularios/estado no coincidentes con backend |
| Selección de cédula/pasaporte/otro | 10 | Captura o mensajes incorrectos por tipo |
| Métricas del embudo | Transversal | Representación o agrupación errónea |
| Combinaciones exhaustivas adicionales y cobertura global | 11 | Interacciones secundarias y huecos de cobertura |
| Recorrido completo E2E | 11 | Integración entre UI/API/Auth/proveedor |
| Lint/build completos | 11 y antes de integrar | Errores globales ajenos al cambio focal |

Las nueve pruebas omitidas preexistentes de `DocumentReviewAfterApproval`,
`SolicitudesAdmin` y `SolicitudDetail` siguen intactas. El registro general enumera
cada una y su riesgo; pertenecen funcionalmente al lote 9; su reactivación se revisará en lote 11 o con
autorización expresa anterior.
Las dos pruebas de objetos de contrato añadidas en lote 1 se retiraron tras este
ajuste por redundancia con tipos; no se sustituyeron por skips.

Guía manual obligatoria: [lote 1](operations/cohortes-lote1.md). No hay pantalla nueva
en este lote. En grupos futuros incluir datos, pasos, resultado y restablecimiento
para cada pantalla/control cambiado cuya prueba automática se difiera.

Aprobaciones: **1 solo → 2+3 → 4+5 → 6+7 → 8+9+10 → 11**.
No iniciar un grupo sin aprobación; entregar y detener al cerrar cada grupo.

## Autorización posterior de pasada continua

Lotes 2 al 11 autorizados sin paradas por grupos. Esta instrucción sustituye la
agrupación anterior. Mantener solo pruebas obligatorias y tipos; no activar indicadores.

Lote 4: automatización de formulario (código/estado/cierre, habilitación, motivo, solo lectura, ayuda de extensión, edición de precios y flota) diferida; riesgo de interacción, accesibilidad y recarga visual cubierto por la guía QA manual del lote 4.

Lote 5: pruebas de componentes del selector A/B, cambio con respuestas tardías, extensión individual y excepción de repetición diferidas. Riesgo: selección visual incorrecta o mensaje no anunciado. Guía manual en operations/cohortes-lote5.md.

Lote 6: automatización de Avísame/WhatsApp, filtro y contadores, diálogo N=0/N>0 y reintento de correo diferida; riesgo de interacción, codificación, foco y presentación de entrega frente a cola. Guía manual en operations/cohortes-lote6.md.
