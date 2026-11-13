# Lote 11 — interfaz de integración

Rama local `feat/cohortes-reglas-inscripcion`, sin push ni main. Implementación entregada; **validación final pendiente** por la instrucción posterior «no hagas pruebas de codigo saltate esa parte». No se ejecutan nuevas suites, tipos, lint ni build desde esa instrucción; no se afirma QA de navegador.

La caja consume el constructor de 10 horas del servidor, presenta las opciones habilitadas del servidor, días efectivos, última sesión y precio por tipo. La elección de cohorte se actualiza con la vista previa válida del plan; una tarifa distinta exige nueva confirmación. Los campos de semanas/fin manual continúan solo en el régimen heredado. La rama nueva de calendario usa reloj/horizonte del servidor y muestra precio antes de reservar.

Se retiran nombres/códigos de cohorte de ficha, resumen y panel del alumno. La ficha administrativa reserva información de pagos al permiso financiero. El embudo se incorpora al panel existente y procede del servidor; no hay pantalla ni tabla nueva. El navegador no lee ni concede los indicadores de activación.

[Entrega, resultados reales, riesgos, despliegue y rollback](../../../coloradosdrive-backend/docs/operations/cohortes-lote11.md).
Las guías manuales se conservan en los documentos de cada lote.
[Archivos exactos](../../../coloradosdrive-backend/docs/operations/cohortes-lote11-archivos.md).

Despliegue: SQL y backend compatibles primero; frontend después, con 14 indicadores apagados. Rollback: tag local L10 compatible conservando campos nuevos y evidencia; revisar la privacidad permanente antes de exponer un cliente anterior. El guion backend explica las restricciones de rollback de pagos, documentos e identidades. No se publica ni activa en esta tarea.

Pendientes: `docs/PRUEBAS_PENDIENTES.md`. El error JSX detectado por un chequeo iniciado antes de la suspensión se corrigió en la fuente, sin repetir ese chequeo. No equivale a un typecheck verde final.

## Cierre documental

L11 queda cerrado como implementación local, sin certificación automática de esta punta. La autorización posterior permite, solo al final de L12, tipos de ambos repos e instalación local completa con verificaciones existentes. No se ejecutan lint, build ni suites. Los ajustes D1–D10 se registran después del tag L11.
