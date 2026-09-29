import type { PublicCourse } from "@/types/publicCourse";

import { CourseCard } from "./CourseCard";
import { ScrollReveal } from "./ScrollReveal";

interface CoursesSectionProps {
  courses: PublicCourse[];
}

export function CoursesSection({ courses }: CoursesSectionProps) {
  return (
    <section id="cursos" className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24">
      <ScrollReveal>
        <h2 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          Nuestros cursos
        </h2>
        <p className="mt-3 max-w-2xl text-text-secondary">
          Dos tipos de licencia, un mismo estándar de formación.
        </p>
      </ScrollReveal>

      {courses.length > 0 ? (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {courses.map((course, index) => (
            <ScrollReveal key={course.id} delay={index * 0.08}>
              <CourseCard course={course} />
            </ScrollReveal>
          ))}
        </div>
      ) : (
        <p className="mt-10 text-text-secondary">
          No pudimos cargar los cursos disponibles en este momento. Intenta de nuevo más tarde.
        </p>
      )}
    </section>
  );
}
