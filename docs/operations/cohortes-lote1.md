# Lote 1 — contratos compatibles 068/069

Rama: `feat/cohortes-reglas-inscripcion`, creada desde
`246ea627e14d71d6e7d1197089bc1b8620124428`.

Se añade `types/enrollmentFoundation.ts` y el campo opcional `individualDates` en
matrícula y reserva. El backend legacy sigue siendo válido sin ese campo. No hay
cambios de pantallas, constructor de planes, endpoints ni autorización en lote 1.
No se leen indicadores de activación desde el navegador.

El esquema 068/069, backfill, preflight exportable, despliegue manual, rollback,
guía QA y ajustes de los lotes futuros están en
[guion backend](../../../coloradosdrive-backend/docs/operations/cohortes-lote1.md).

## Verificación local y QA

```sh
./node_modules/.bin/tsc --noEmit --incremental false
```

Desde el ajuste de alcance solo se conserva el chequeo de tipos en frontend para
este lote: las dos pruebas de objetos de contrato añadidas inicialmente fueron
retiradas por redundancia. No se modifican las nueve pruebas omitidas preexistentes.
No hay interfaz nueva ni flujo activado que probar en lote 1. El guion backend cubre
la consola QA local y sus datos, pasos, resultados y restablecimiento.
En los grupos siguientes la guía manual cubrirá cada pantalla y control modificado
cuya automatización quede diferida; no se presentará como ejecutada sin hacerlo.

Pendientes, riesgos y agrupación de aprobaciones:
[PRUEBAS_PENDIENTES.md](../PRUEBAS_PENDIENTES.md).

Despliegue: publicar este código compatible solo con la autorización operativa
correspondiente; aplicar SQL manualmente según el guion backend. Mantener todos los
indicadores apagados. Rollback frontend: volver al commit anterior de contratos;
no hay almacenamiento ni variables de entorno nuevas que restaurar.

La interfaz de duraciones y sus 12 combinaciones quedan para el lote autorizado
correspondiente; no se empieza lote 2. No hay push en este lote.
