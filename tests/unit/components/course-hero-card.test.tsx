// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseHeroCard } from "@/components/lms/course-hero-card";
import type { StudentCoursePlayerDetail } from "@/types/domain";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

function makeDetail(overrides?: Partial<StudentCoursePlayerDetail>): StudentCoursePlayerDetail {
  return {
    course: {
      id: "c1",
      slug: "test-course",
      title: "Test Course",
      description: "A test course",
      coverUrl: null,
      durationHours: 10,
      status: "PUBLISHED",
      traversalMode: "sequential",
      modulesCount: 3,
      lessonsCount: 10,
      instructors: [],
    },
    enrollment: "ACTIVE",
    progress: { completed: 5, total: 10, percent: 50 },
    modules: [],
    curator: undefined,
    certificateEligible: false,
    completionThreshold: 80,
    ...overrides,
  };
}

describe("CourseHeroCard", () => {
  it("renders course title and progress", () => {
    render(<CourseHeroCard detail={makeDetail()} />);
    expect(screen.getByText("Test Course")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("5/10 уроков")).toBeInTheDocument();
  });

  it("shows placeholder when no coverUrl", () => {
    render(<CourseHeroCard detail={makeDetail()} />);
    expect(document.querySelector("img")).not.toBeInTheDocument();
  });

  it("shows cover image when coverUrl provided", () => {
    const detail = makeDetail({ course: { ...makeDetail().course, coverUrl: "/cover.jpg" } });
    render(<CourseHeroCard detail={detail} />);
    const img = document.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/cover.jpg");
  });

  it("shows certificate button when eligible", () => {
    const detail = makeDetail({ certificateEligible: true });
    render(<CourseHeroCard detail={detail} />);
    expect(screen.getByText("Получить сертификат")).toBeInTheDocument();
  });

  it("shows certificate placeholder when not eligible", () => {
    const detail = makeDetail({ certificateEligible: false, completionThreshold: 80 });
    render(<CourseHeroCard detail={detail} />);
    expect(screen.getByText(/Сертификат после 80%/)).toBeInTheDocument();
  });

  it("shows curator section with unanswered count", () => {
    const detail = makeDetail({
      curator: { name: "Ivan Petrov", unansweredCount: 3 },
    });
    render(<CourseHeroCard detail={detail} />);
    expect(screen.getByText("Ivan Petrov")).toBeInTheDocument();
    expect(screen.getByText("3 неотвеченных вопросов")).toBeInTheDocument();
  });

  it("shows paused badge when enrollment is PAUSED", () => {
    const detail = makeDetail({ enrollment: "PAUSED" });
    render(<CourseHeroCard detail={detail} />);
    expect(screen.getByText("Обучение приостановлено")).toBeInTheDocument();
  });
});
