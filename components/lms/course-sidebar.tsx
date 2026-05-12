import { CourseHeroCard } from "./course-hero-card";
import type { StudentCoursePlayerDetail } from "@/types/domain";

export function CourseSidebar({ detail }: { detail: StudentCoursePlayerDetail }) {
  return (
    <aside className="sticky top-24">
      <CourseHeroCard detail={detail} />
    </aside>
  );
}
