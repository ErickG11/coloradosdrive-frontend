# Pruebas pendientes frontend

Alcance ajustado por el dueño durante lote 1: solo tipos y pruebas obligatorias del
grupo autorizado. No ejecutar componentes/UI, cobertura, regresión exhaustiva ni
lint/build completos por lote. No añadir skips. Solo lote 1 está autorizado.

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
