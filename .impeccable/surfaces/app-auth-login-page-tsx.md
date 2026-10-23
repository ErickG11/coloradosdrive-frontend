---
version: 1
slug: "app-auth-login-page-tsx"
primary_target: "app/(auth)/login/page.tsx"
related_targets: ["app/(auth)/login/LoginForm.tsx","components/auth/LoginScreen.tsx","components/auth/login.module.css"]
---

# Login con fondo de marca

Modo: Operate. Ruta: `/login`. Referencia vinculante: `docs/login-referencia.png`, proporcionada por el usuario; la imagen de fondo es exclusivamente `public/images/login-fondo.png`. Los nombres JPG y subcarpetas indicados por el usuario no existen en este checkout; se usan los PNG equivalentes ya revisados.

## Direction contract

THESIS: Reproducir la tarjeta de acceso sobre la fotografía de marca, preservando el logo y los pilares incrustados.

OWN-WORLD: Vidrio claro/oscuro, rojo de marca, Inter y controles legibles; radios amplios y degradado rojo pedidos explícitamente como excepción local del login.

STORY: Correo y contraseña, mostrar/ocultar, enviar y comprender carga o error. No se implementan recordatorio, recuperación ni acceso social inexistentes.

FIRST VIEWPORT: Fondo original con proporción 1672:941, anclado arriba/izquierda. Tarjeta a la izquierda entre logo y barra inferior. En ultrapanorámico, escena centrada con el mismo fondo difuminado a los lados. Móvil: foto superior recortada, tarjeta superpuesta y pilares HTML debajo.

FORM: Referencia visual fijada por el usuario; sin selección conceptual ni comp generado. El usuario confirmó verificar la autenticación y las rutas por comparación de código, sin acceso real con credenciales.

FINISH: Capturas 1280 claro, 1280 oscuro y 375 claro; navegación por teclado, foco, carga, errores y reduced-motion; lint y build. No ejecutar ni modificar tests. Un commit `feat: login con fondo de marca`, sin push.

## Procedencia

Referencia e imagen aportadas por el usuario. La referencia nunca se sirve como fondo. No se modifican los archivos raster originales; encuadre, difuminado y velo nocturno se realizan con CSS.
