import { redirect } from "next/navigation";

import { getPublicCourses } from "@/lib/api/publicCourses";
import { getUserRole } from "@/lib/supabase/getUserRole";
import { createClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/utils/roleRedirect";
import { LandingPage } from "@/components/landing/LandingPage";

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
