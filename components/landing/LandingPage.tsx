import type { PublicCourse } from "@/types/publicCourse";

import { CoursesSection } from "./CoursesSection";
import { LandingFooter } from "./LandingFooter";
import { LandingHeader } from "./LandingHeader";
import { LandingHero } from "./LandingHero";
import { MotionRoot } from "./MotionRoot";
import { RequirementsSection } from "./RequirementsSection";
import { ScheduleSection } from "./ScheduleSection";

interface LandingPageProps {
  courses: PublicCourse[];
}

// Landing pública de "/" para visitantes sin sesión (ver app/page.tsx: con
// sesión se mantiene el redirect a dashboard existente, sin tocar esa
// lógica).
export function LandingPage({ courses }: LandingPageProps) {
  return (
    <MotionRoot>
      <div className="flex min-h-full flex-1 flex-col">
        <LandingHeader />
        <main className="flex-1">
          <LandingHero />
          <CoursesSection courses={courses} />
          <RequirementsSection />
          <ScheduleSection />
        </main>
        <LandingFooter />
      </div>
    </MotionRoot>
  );
}
