import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getPublicCourses } from "@/lib/api/publicCourses";
import { getUserRole } from "@/lib/supabase/getUserRole";
import { createClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/utils/roleRedirect";
import { LandingPage } from "@/components/landing/LandingPage";
import { landingContent } from "@/lib/content/landing";

// La plantilla del layout raíz no aplica a la página de su mismo segmento.
export const metadata: Metadata = {
  title: "ColoradosDrive · Escuela de conducción",
  description: `${landingContent.slogan}. Cursos Tipo B para vehículos livianos y Tipo A para motocicletas en Santo Domingo, Ecuador.`,
  openGraph: {
    title: "Conduce tu futuro con Colorados Drive",
    description: landingContent.description,
    locale: "es_EC",
    type: "website",
    siteName: landingContent.name,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1672,
        height: 941,
        alt: "Conduce tu futuro con Colorados Drive",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Conduce tu futuro con Colorados Drive",
    description: landingContent.description,
    images: ["/opengraph-image.png"],
  },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const courses = await getPublicCourses();
    return <LandingPage courses={courses} />;
  }

  const role = getUserRole(user);
  redirect(role ? getRoleHomePath(role) : "/login");
}
