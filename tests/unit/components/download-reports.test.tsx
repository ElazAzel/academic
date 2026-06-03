// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DownloadReports } from "@/components/lms/download-reports";

afterEach(() => cleanup());

describe("DownloadReports", () => {
  it("renders report scope metadata in Russian", () => {
    render(
      <DownloadReports
        reports={[
          {
            id: "progress",
            title: "Прогресс",
            desc: "Сводка по обучению",
            icon: "bar_chart",
            owner: "Наблюдатель",
            scope: "Только разрешенные проекты",
            decision: "Контроль прогресса",
          },
        ]}
      />,
    );

    expect(screen.getByText("Наблюдатель")).toBeInTheDocument();
    expect(screen.getByText("Область:")).toBeInTheDocument();
    expect(screen.queryByText("Scope:")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CSV/ })).toHaveAttribute(
      "href",
      "/api/v1/reports?type=progress&format=csv",
    );
  });
});
