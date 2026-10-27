export interface LandingImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

const whatsappNumbers = [
  { display: "0992042546", international: "593992042546" },
  { display: "0997913888", international: "593997913888" },
] as const;

export function whatsappHref(
  message = "Hola, Colorados Drive. Quiero información para inscribirme en un curso de conducción.",
  phone: string = whatsappNumbers[0].international,
) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

const address = "Padre German Maya y Pedro Vicente Maldonado, Santo Domingo";

export const landingContent = {
  name: "Colorados Drive",
  platformName: "ColoradosDrive",
  slogan: "Formamos conductores para un mejor mañana",
  description:
    "Formación profesional para carro y moto, con instructores expertos y un aprendizaje seguro desde el primer día.",
  address,
  mapsHref: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
  whatsapp: whatsappNumbers.map((phone) => ({
    ...phone,
    href: whatsappHref(undefined, phone.international),
  })),
  enrollmentHref: whatsappHref(),
  hours: null as string | null,
  email: null as string | null,
  socialLinks: null as { label: string; href: string }[] | null,
  navigation: [
    { label: "Cursos", href: "#cursos" },
    { label: "Plataforma", href: "#plataforma" },
    { label: "Prácticas", href: "#practicas" },
    { label: "Contacto", href: "#contacto" },
  ],
  trust: ["Instructores certificados", "Formación segura y práctica", "Vehículos modernos"],
  courses: [
    {
      type: "B",
      name: "Licencia Tipo B",
      description: "Vehículos livianos · Manual y automático",
      price: 175,
      image: {
        src: "/images/landing/curso-tipo-b.webp",
        width: 1773,
        height: 887,
        alt: "Banner del curso Tipo B con un vehículo liviano de Colorados Drive y sus beneficios de formación.",
      },
      benefits: ["Instructores certificados", "Formación segura y práctica", "Vehículos modernos"],
      href: whatsappHref(
        "Hola, Colorados Drive. Quiero inscribirme en el curso Tipo B para vehículos livianos ($175 + IVA). ¿Qué fechas y cohortes están disponibles?",
      ),
    },
    {
      type: "A",
      name: "Licencia Tipo A",
      description: "Motocicletas",
      price: 135,
      image: {
        src: "/images/landing/curso-tipo-a.webp",
        width: 1774,
        height: 887,
        alt: "Banner del curso Tipo A con un motociclista equipado y los beneficios de la formación en vía y circuito.",
      },
      benefits: [
        "Instructores certificados",
        "Formación segura y práctica",
        "Manejo real en vía y circuito",
      ],
      href: whatsappHref(
        "Hola, Colorados Drive. Quiero inscribirme en el curso Tipo A para motocicletas ($135 + IVA). ¿Qué fechas y cohortes están disponibles?",
      ),
    },
  ],
  platformFeatures: [
    "Material y contenidos del curso",
    "Exámenes de práctica con calificación inmediata",
    "Consulta y confirmación de horarios de práctica",
    "Pagos en línea",
    "Certificado digital con QR",
  ],
  steps: [
    {
      title: "Matrícula",
      description: "Elige tu curso y consulta la próxima cohorte por WhatsApp.",
    },
    {
      title: "Clases y exámenes",
      description: "Aprende la teoría y pon a prueba tus conocimientos.",
    },
    { title: "Prácticas", description: "Lleva lo aprendido al volante, con acompañamiento real." },
    {
      title: "Certificado",
      description: "Completa tu formación y accede a tu certificado digital.",
    },
  ],
  roles: [
    {
      id: "estudiante",
      label: "Estudiante",
      title: "Tu aprendizaje, siempre a mano.",
      description:
        "Desde el celular, sigue tu formación y encuentra lo que necesitas para tu siguiente paso.",
      features: [
        "Consulta tu curso y prepárate para los exámenes.",
        "Revisa tus horarios y confirma tu asistencia a prácticas.",
        "Realiza pagos en línea y consulta tus comprobantes.",
        "Accede a tu certificado digital con QR al graduarte.",
      ],
      summary: "De la matrícula al certificado",
      journey: ["Tu curso", "Tus prácticas", "Tu certificado"],
    },
    {
      id: "instructor",
      label: "Instructor",
      title: "La información para tu próxima práctica.",
      description:
        "Una vista de consulta puntual, pensada para encontrar la información con rapidez.",
      features: [
        "Consulta tus horarios de práctica.",
        "Revisa la información de las prácticas asignadas.",
        "Recibe avisos cuando cambia la asistencia.",
        "Acceso de solo lectura, según tu rol.",
      ],
      summary: "Una consulta clara, a tiempo",
      journey: ["Tus horarios", "Tus prácticas", "Avisos de asistencia"],
    },
    {
      id: "administrador",
      label: "Administrador",
      title: "Todo el ciclo del alumno, en un lugar.",
      description: "Gestiona el día a día de la escuela con una vista conectada de sus procesos.",
      features: [
        "Organiza alumnos, matrículas, cursos y cohortes.",
        "Gestiona prácticas, exámenes y pagos.",
        "Consulta el ranking de instructores, exclusivo de administración.",
        "Atiende la bandeja de WhatsApp Business.",
      ],
      summary: "Una escuela conectada",
      journey: ["Alumnos y cohortes", "Prácticas y pagos", "Seguimiento"],
    },
  ],
} as const;

export const landingImages = {
  logo: {
    src: "/images/landing/logo.webp",
    width: 1774,
    height: 887,
    alt: "Colorados Drive, escuela de conducción",
  },
  hero: {
    src: "/images/login-fondo.png",
    width: 1672,
    height: 941,
    alt: "Detalle de un vehículo y del edificio de Colorados Drive al atardecer.",
  },
  platform: {
    src: "/images/landing/plataforma.webp",
    width: 1774,
    height: 887,
    alt: "Ilustración promocional del aprendizaje en la plataforma de Colorados Drive desde una computadora.",
  },
  practice: {
    src: "/images/landing/practicas.webp",
    width: 1672,
    height: 941,
    alt: "Imagen promocional de una estudiante al volante con la guía de un instructor de Colorados Drive.",
  },
  classes: {
    src: "/images/landing/clases.webp",
    width: 1774,
    height: 887,
    alt: "Imagen promocional de una clase sobre el funcionamiento del vehículo con un instructor y estudiantes.",
  },
  contact: {
    src: "/images/landing/contacto.webp",
    width: 1774,
    height: 887,
    alt: "Banner de contacto de Colorados Drive con sus dos números de WhatsApp y una referencia visual de su dirección.",
  },
  closing: {
    src: "/images/landing/hero-conduce-tu-futuro.webp",
    width: 1672,
    height: 941,
    alt: "Banner Conduce tu futuro con Colorados Drive: formación para carro y moto e invitación a inscribirse.",
  },
} satisfies Record<string, LandingImage>;

export const educationalOrganization = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: landingContent.name,
  alternateName: landingContent.platformName,
  slogan: landingContent.slogan,
  description: landingContent.description,
  telephone: landingContent.whatsapp.map((phone) => `+${phone.international}`),
  address: {
    "@type": "PostalAddress",
    streetAddress: "Padre German Maya y Pedro Vicente Maldonado",
    addressLocality: "Santo Domingo",
    addressCountry: "EC",
  },
  hasMap: landingContent.mapsHref,
};
