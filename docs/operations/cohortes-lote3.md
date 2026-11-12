# Lote 3 — selector, reservas y pago

Selector con calendario mensual de fechas disponibles calculadas en SQL; días efectivos y fecha final desde el constructor del backend. La reserva se consulta por matrícula. El pago en proceso conserva su estado aunque llegue el contador a cero. Aviso a dos minutos y precio de la instantánea. Se retiran nombres de grupo del selector y banner. No se añadieron pruebas de componentes.

Tipos de fuente frontend comprobados. Guion de despliegue, rollback, evidencia de diez escenarios SQL, guía QA de calendario/contador/precio/red y errores/alertas: [lote 3 backend](../../../coloradosdrive-backend/docs/operations/cohortes-lote3.md). No hay push ni activación. El calendario requiere la activación coordinada descrita allí después del cierre de integración. Rollback frontend: código anterior compatible; primero resolver reservas/pagos nuevos según el guion SQL.
