# Lote 10 — documento tipado

Solicitud y matrícula manual permiten cédula, pasaporte u otro según la oferta del servidor. Representante también admite documento tipado. Resumen, búsquedas y fichas conservan tipo y número; no convierten pasaporte en cédula. Sin oferta nueva, se conserva el comportamiento de contacto previo.

Dos escenarios agrupados locales OK: unicidad por par, solicitud/aprobación real junto a cédula del mismo número, menor/representante y backfill con rollback/reaplicación. Tipos ambos repositorios OK. No se ejecutó navegador ni Auth remoto; componentes/accesibilidad diferidos. Indicadores apagados, sin push.

[Guion y QA backend: archivos, datos, pasos, códigos, reset y riesgos](../../../coloradosdrive-backend/docs/operations/cohortes-lote10.md). Aplicar 080 manualmente tras 079; mantener lectores compatibles con datos nuevos en cualquier rollback. No cambiar un tipo para encajar en la restricción antigua ni borrar extranjeros.
