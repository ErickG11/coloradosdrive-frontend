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
npm test -- tests/types/enrollmentFoundation.test.ts
./node_modules/.bin/tsc --noEmit --incremental false
```

Datos de prueba: reserva sintética legacy sin `individualDates` e instantánea sin
evidencia con fechas/importes NULL y `guardReady=false`.
Resultado esperado: ambas son compatibles sin inventar fechas, conceder acceso ni
alterar el contrato de respuesta activo. Las pruebas no consultan API ni Supabase.
Restablecimiento: no persisten datos; volver a ejecutar recrea los objetos.

Despliegue: publicar este código compatible solo con la autorización operativa
correspondiente; aplicar SQL manualmente según el guion backend. Mantener todos los
indicadores apagados. Rollback frontend: volver al commit anterior de contratos;
no hay almacenamiento ni variables de entorno nuevas que restaurar.

La interfaz de duraciones y sus 12 combinaciones quedan para el lote autorizado
correspondiente; no se empieza lote 2. No hay push en este lote.
