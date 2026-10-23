import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { getPublicCourses } from "@/lib/api/publicCourses";
import { getUserRole } from "@/lib/supabase/getUserRole";
import { createClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/utils/roleRedirect";
import { LandingPage } from "@/components/landing/LandingPage";
import { landingContent } from "@/lib/content/landing";

const homeMetadata: Metadata = {
  title: "Colorados Drive | Escuela de conducción en Santo Domingo",
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

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() ?? requestHeaders.get("host");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
        ? "http"
        : "https";
  return { ...homeMetadata, ...(host ? { metadataBase: new URL(`${protocol}://${host}`) } : {}) };
}

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
