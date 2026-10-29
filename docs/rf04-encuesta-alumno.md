# RF-04: encuesta del alumno

La página inicial del alumno muestra **Encuestas pendientes** con instructor, fecha de la práctica y tiempo restante. El historial ofrece **Calificar** solo para prácticas que la lista de pendientes del backend confirmó. Ambos lugares abren el mismo formulario de 1 a 5 estrellas y comentario opcional de hasta 1000 caracteres.

El aviso `encuesta_practica` de la bandeja lleva al panel inicial con la práctica indicada. Al llegar se consulta de nuevo `GET /estudiantes/practice-ratings/pending`; el aviso por sí solo no habilita el envío. El formulario llama a `POST /estudiantes/practice-ratings`. Tras enviar, muestra una confirmación y actualiza la lista. Si la práctica ya fue calificada, expiró o dejó de estar disponible, muestra el motivo y vuelve a consultar pendientes.

El frontend solo presenta ventanas que devuelve la API. La asistencia, el inicio y cierre de la ventana, la unicidad y las correcciones se validan en el backend y en la migración 035. El alumno no recibe promedios ni ranking de instructores.
