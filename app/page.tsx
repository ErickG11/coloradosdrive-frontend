import { redirect } from "next/navigation";

import { getUserRole } from "@/lib/supabase/getUserRole";
import { createClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/utils/roleRedirect";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = getUserRole(user);
  redirect(role ? getRoleHomePath(role) : "/login");
}
