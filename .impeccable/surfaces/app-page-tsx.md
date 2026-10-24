---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["components/landing/LandingPage.tsx","components/landing/landing.module.css"]
---

# Landing pública de Colorados Drive

Modo: Persuade. Ruta: `/`. Audiencia: personas que buscan formación para carro o moto en Santo Domingo. Acción: consultar una cohorte e inscribirse por WhatsApp. Pruebas: imágenes y datos proporcionados por el usuario. El acceso autenticado se conserva.

## Direction contract

THESIS: «Tu futuro. En marcha.» La persona elige carro o moto y recorre visualmente su formación hasta el certificado. La fotografía de marca, la tipografía y el movimiento hacen visible ese camino.

OWN-WORLD: Blanco/rojo y negro/rojo, Inter existente, superficies sólidas y radios del sistema. Portada, recorrido y cierre usan negro fotográfico en ambos temas como material de campaña. Cursos conservan los banners completos; los otros encuadres destacan la parte fotográfica. Ningún raster se edita.

STORY: Elegir A o B, entender la formación y la plataforma, conocer el recorrido y contactar a la escuela con información real.

FIRST VIEWPORT: Portada fotográfica de borde a borde, titular HTML grande en dos líneas, acciones existentes y ubicación. Selector Carro/Tipo B y Moto/Tipo A cambia la fotografía y el ancla de exploración. Entrada del titular por máscara y revelado fotográfico; parallax ligado al scroll. Móvil: titular y acciones primero, fotografía y selector debajo. Transiciones individuales de 120–280 ms y alternativa reduced-motion.

FORM: El usuario pidió un rediseño integral más ambicioso con motion y una sola entrega («prosigue, hazlo bien»), delegando la dirección. Se conserva identidad y contenido confirmado; la propuesta del recorrido guía la nueva estructura. Code-first, sin comp ni rondas de aprobación. seed:bca0695a8eae1b4f (superficie Persuade); la dirección y ejecución delegadas por el usuario prevalecen sobre la selección interactiva.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Decisiones pendientes: dominio público definitivo; horario, correo y redes permanecen null.

## Procedencia de imágenes

Las nueve imágenes PNG de `public/images/` fueron proporcionadas por el usuario y revisadas individualmente antes de diseñar. Se conservan sus archivos originales y dimensiones; los encuadres fotográficos y velos de lectura se realizan solo con CSS. `public/opengraph-image.png` es una copia exacta de `hero-conduce-tu-futuro.png` (SHA-256 idéntico). No se utilizaron imágenes de terceros ni se generaron imágenes nuevas.

Ocho derivados WebP locales en `public/images/landing/` evitan la optimización de imágenes durante la petición: calidad 82 y dimensiones originales; logo a 512 px y calidad 90. Conversión con sharp ya instalado por Next, sin nuevas dependencias. Los ocho PNG suman 16.146.475 bytes y sus derivados 1.241.306 bytes. `provenance.json` registra origen, transformación y SHA-256 de cada original. Los PNG de origen y la imagen del login permanecen intactos.
