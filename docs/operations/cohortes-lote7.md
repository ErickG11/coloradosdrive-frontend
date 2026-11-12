# Lote 7 — interfaz de cambios y reasignación

Mi inscripción incorpora cambio individual con calendario del servidor, preview sin retención y propuesta de 15 minutos. La ficha de Alumnos permite reasignar con motivo y destino del mismo tipo; Cohortes permite seleccionar matrículas, comprobar capacidad del grupo, confirmar atómicamente o cancelar con motivo. La caja no ofrece cobro de propuestas de cambio. Se mantiene ventana de 48 horas y todos los indicadores apagados.

El frontend presenta los planes recibidos: no replica constructor ni reglas de capacidad. Chequeo de tipos OK. Cinco escenarios SQL obligatorios y rollback/reaplicación OK en backend; no se ejecutaron componentes, navegador ni correos.

[Guion completo backend, datos QA, pasos, errores, restauración y riesgos](../../../coloradosdrive-backend/docs/operations/cohortes-lote7.md). Desplegar después de aplicar manualmente 076–077 en el orden indicado. Rollback frontend: tag previo, conservando compatibilidad del correo en cola; ningún estado se almacena localmente. Mantener indicadores apagados.

La automatización de UI y accesibilidad queda en [pruebas pendientes](../PRUEBAS_PENDIENTES.md). QA manual obligatoria descrita en el guion; aún no ejecutada.
