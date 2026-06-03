// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CertificatesDashboard } from "@/components/admin/certificates-dashboard";

const students = [{ id: "student-1", name: "Иван Иванов", email: "ivan@example.test" }];
const courses = [{ id: "course-1", title: "Стратегический курс" }];

async function openIssueForm(user: ReturnType<typeof userEvent.setup>) {
  render(
    <CertificatesDashboard
      initialStudents={students}
      initialCourses={courses}
      initialCertificates={[]}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Выдать сертификат" }));
  await user.type(screen.getByLabelText(/слушателя/i), "Иван");
  await user.click(await screen.findByText("Иван Иванов"));
  await user.selectOptions(screen.getByLabelText(/учебную программу/i), "course-1");
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CertificatesDashboard", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  it("shows controlled certificate API errors from the standard error envelope", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: "Условия выдачи сертификата не выполнены" } }),
          { status: 403, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await openIssueForm(user);
    await user.click(screen.getByRole("button", { name: /выдать сертификат и записать/i }));

    expect(await screen.findByText("Условия выдачи сертификата не выполнены")).toBeInTheDocument();
  });

  it("does not expose raw network errors while issuing certificates", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("postgres://secret-certificate-error")));

    await openIssueForm(user);
    await user.click(screen.getByRole("button", { name: /выдать сертификат и записать/i }));

    expect(await screen.findByText("Не удалось выпустить сертификат")).toBeInTheDocument();
    expect(screen.queryByText(/secret-certificate-error/i)).not.toBeInTheDocument();
  });
});
