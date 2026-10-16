# Ficha, requisitos y horario

Rama feat/estudiantes-ficha-horario-requisitos, sobre feat/estudiantes-busqueda-mejorada.

La ficha consulta únicamente GET /admin/estudiantes/:id. El backend debe publicarse primero con graduation y practiceSchedule; no se requiere migración 029.

Encabezado: nombre, cuenta, cédula, teléfono, correo y matrículas vigentes con curso/cohorte y la acción de asignar existente. Después: acciones A–D, requisitos pendientes antes que cumplidos, horario de lectura e historial colapsable; al final datos personales y detalle de matrículas.

El horario usa America/Guayaquil. No ofrece creación, reserva ni movimiento de prácticas. El componente antiguo StudentReservations y su endpoint siguen disponibles, pero la ficha ya no los utiliza. Los motivos de recuperación reutilizan su traducción existente.

Se incluye el alumno sintético tests/fixtures/studentGraduation.ts: saldo $70 de $100, abono $30, 6/10 horas, 1/2 definitivos, cédula pendiente, reservas futuras e historial. No se creó un usuario real. La prueba StudentGraduation.test.tsx verifica una sola petición, orden de pendientes, detalle concreto, estados, hora local, historial cerrado, vacíos y reintento.

Las reglas de cálculo, limitaciones de liberaciones sin snapshot y exámenes por alumno/curso, y la prueba manual de cinco pasos están en docs/operations/estudiantes-ficha-horario-requisitos.md del backend.
