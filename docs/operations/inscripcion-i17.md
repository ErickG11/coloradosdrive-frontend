# I17 · revisión manual de inscripción

Contrato backend: `docs/operations/inscripcion-flujo-final.md` y migración063 del
repositorio backend. Desplegar ambos contratos juntos, después de aplicar063
manualmente. No se ejecutaron suites de pruebas ni se iniciaron servidores.

La ficha de solicitudes se acopla a la derecha desde1280px y se apila debajo de
la lista en anchuras menores. Nunca usa scrim, portal, bloqueo de scroll ni foco
modal. Su cabecera y pie permanecen separados del cuerpo desplazable; las acciones
abren el formulario de decisión dentro del pie sin enviar al pulsar Aprobar/Rechazar.
Se conserva la confirmación explícita y el servidor revalida permisos y requisitos.
Las pestañas admiten flechas, Inicio/Fin y Tab. Escape cierra desde el panel.

El seguimiento carga al abrir y cada60s solo con pestaña visible. Conserva el último
resultado durante la actualización y permite Actualizar; no emite correo ni expone
métodos, notas, actores o resultados negativos de verificaciones. El paso aprobado
conserva las instrucciones para usar el enlace de contraseña del flujo existente.
El nivel retirado no se ofrece ni se reenvía automáticamente desde datos guardados;
el backend conserva la lectura histórica sin cambiar el CHECK.

Revisar en claro/oscuro y375/768/1280px:

- `/inscripcion`: requisitos integrados, edad del curso y pendientes al pulsar Continuar.
- Datos: vacíos, nombres con tildes/apóstrofo/guion y dígitos prohibidos, cédula/checksum,
  teléfono09 y02–07, prefijos/separadores, fechas imposibles/futuras y edad mínima,
  nacionalidad/sangre y representante si aplica; foco/alertas, autocomplete y ayudas.
- Cédula duplicada: únicamente el mensaje genérico, sin confirmar existencia.
- Estudios: orden de las cinco opciones; bloqueo menos de décimo; certificado por
  nivel, retirada del anterior nivel y conservación de la subida actual.
- Estado: última verificación positiva/negativa de cada tipo, aprobación y lista para
  pagar, Actualizar, offline/reintento, pestaña oculta y retorno visible sin parpadeo.
- `/crear-contrasena`: comprobar visualización y flujo existente sin cambios funcionales.
- `/admin/solicitudes`: buscar con `/`, abrir/cerrar/cambiar ficha, resúmenes libres,
  lista estrecha, scroll independiente, pestañas con teclado, pie visible y razón de
  bloqueo; aprobar con cada método manual en identidad y estudios (incluidos original
  y revisión visual), última verificación/frescura, devolver/rechazar/confirmación.
- Insignia del menú: contador1/99/99+, ítem activo/inactivo, ambos temas y teclado.

La verificación visual y funcional en navegador queda al operador por el método
sin pruebas/servidores. No se cambian componentes compartidos, tokens o navegación
fuera de la insignia autorizada. No se configura Turnstile ni proveedores de pago.
