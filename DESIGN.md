# ColoradosDrive — sistema visual

## Producto y tono

Interfaz web de gestión para una escuela de conducción con paneles de administración, estudiantes e instructores. Debe transmitir profesionalismo, modernidad y confianza. La experiencia se siente dinámica e interactiva, con respuestas claras y rápidas.

## Identidad de color

- Tema claro: blanco y superficies claras, texto oscuro y rojo de marca.
- Tema oscuro: superficies negras o gris carbón, texto claro y rojo de marca.
- El rojo identifica acciones principales, navegación activa, foco de búsqueda, filtros seleccionados, errores y acciones destructivas. Úsalo con intención, no como color de relleno general.
- Estados semánticos: verde para éxito/activo, ámbar para pendiente/atención, azul para información y gris para inactivo/neutro. Cada estado incluye una etiqueta textual; nunca depende solo del color.
- Conserva los tokens existentes en `app/globals.css` y sus equivalentes para ambos temas. Texto normal: contraste mínimo 4.5:1 respecto a su superficie.

## Superficies y composición

- Prioriza fondos sólidos y neutros, bordes discretos y jerarquía mediante tipografía, espacio y color.
- Evita tarjetas dentro de tarjetas, apariencia de plantilla genérica, acentos morados y gradientes morados.
- Evita llenar la pantalla de rojo, contornos decorativos, brillos y sombras fuertes.
- El contenido puede crecer hasta aproximadamente 1320 px. Mantén legibilidad y espacio lateral en 375, 768 y 1280 px; evita desbordamiento horizontal del documento.
- Alinea tablas, formularios, filtros y encabezados con una retícula común. Usa superficies elevadas solo cuando ayuden a entender la jerarquía.

## Tipografía y controles

- Usa Inter y la escala tipográfica existente. Texto de estado y metadatos nunca menor de 12 px.
- Mantén nombres, etiquetas y acciones breves y claros. Los estados deben conservar su significado textual.
- Los controles comparten radios, bordes, alturas y estados de foco existentes. El foco visible debe distinguirse con claridad en ambos temas.

## Movimiento e interacción

- Las animaciones son rápidas y sutiles, siempre menores de 300 ms.
- Usa cambios de color, opacidad o desplazamientos cortos para confirmar acciones y transiciones entre pantallas. Incluye feedback al presionar.
- No uses transiciones lentas, rebotes exagerados ni efectos pesados que distraigan o cansen.
- Respeta `prefers-reduced-motion`; la información y el feedback deben seguir disponibles sin movimiento.

## Accesibilidad y consistencia

- Cumple contraste mínimo 4.5:1 para texto normal y conserva indicadores de foco de teclado.
- Acompaña color con texto o iconografía comprensible; etiqueta campos y comunica errores con texto.
- Mantén patrones compartidos entre paneles de administración, estudiante e instructor.
- Conserva comportamiento, rutas, permisos y contratos existentes al aplicar cambios visuales.
