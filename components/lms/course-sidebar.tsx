import { CourseHeroCard } from "./course-hero-card";
import type { StudentCoursePlayerDetail } from "@/types/domain";

export function CourseSidebar({ detail }: { detail: StudentCoursePlayerDetail }) {
  return (
    <aside className="student-course-player-sidebar">
      <CourseHeroCard detail={detail} />
    </aside>
  );
}
