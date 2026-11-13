# ADR: interfaz de inscripción y cambio de plan del alumno

Estado: aprobado. Decisión del dueño: 12/11/2026. Implementación: C10.

El alumno solicita los cambios de plan por WhatsApp a la escuela. El cambio de plan queda oculto en todo el frontend del alumno: no se monta el panel, no se consultan propuestas ni se ofrecen reservas o intercambios. Se retiran también las acciones finales de Mi inscripción, conservando los pasos de documentos, horario y pago y sus estados.

El backend, sus rutas, indicadores y contratos se conservan intactos. También se conservan el selector de plan del Paso 2, la matrícula manual y la reasignación de plan del administrador. El antiguo componente mixto se sustituye por AdminPlanChangePanel, con tipos de uso administrativo y sin una rama del alumno.

Este ADR documenta exclusivamente la interfaz y complementa los ADR de inscripción del backend sin modificarlos. C10 no incorpora SQL ni migraciones.
