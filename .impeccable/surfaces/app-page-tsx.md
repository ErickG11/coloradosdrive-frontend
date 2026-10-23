---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["components/landing/LandingPage.tsx","components/landing/landing.module.css"]
---

# Landing pública de Colorados Drive

Modo: Persuade. Ruta: `/`. Audiencia: personas que buscan formación para carro o moto en Santo Domingo. Acción: consultar una cohorte e inscribirse por WhatsApp. Pruebas: imágenes y datos proporcionados por el usuario. El acceso autenticado se conserva.

## Direction contract

THESIS: Las diagonales rojas de los banners de Colorados Drive guían del primer vistazo a la matrícula; el contenido se lee fuera de las imágenes con texto incrustado.

OWN-WORLD: Blanco/rojo y negro/rojo, Inter existente, superficies sólidas, radios del sistema y acentos contenidos. Imágenes originales completas, excepto el recorte fotográfico del hero solicitado.

STORY: Elegir A o B, entender la formación y la plataforma, conocer el recorrido y contactar a la escuela con información real.

FIRST VIEWPORT: Header fijo con logo blanco, anclas, tema y acciones; hero dividido, título y CTAs a la izquierda, recorte de la zona derecha de login-fondo a la derecha con corte diagonal rojo. En móvil, imagen primero. Entrada escalonada inferior a 300 ms y parallax máximo de 20 px.

FORM: Estructura e identidad fijadas por el brief del usuario, dentro del sistema existente. Referencia de composición One motif aplicada solo donde coincide con el brief. seed: no aplica (estructura e identidad fijadas por el usuario); no hubo selección abierta ni comp, conforme a la ruta code-first solicitada.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Decisiones pendientes: dominio público definitivo; horario, correo y redes permanecen null.

## Procedencia de imágenes

Las nueve imágenes PNG de `public/images/` fueron proporcionadas por el usuario y revisadas individualmente antes de diseñar. Se conservan sus archivos originales y dimensiones; el recorte del hero se realiza solo con CSS. `public/opengraph-image.png` es una copia exacta de `hero-conduce-tu-futuro.png` (SHA-256 idéntico). No se utilizaron imágenes de terceros ni se generaron imágenes nuevas.
