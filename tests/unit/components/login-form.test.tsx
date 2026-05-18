// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/auth/login-form";

const mockSignIn = vi.hoisted(() => vi.fn());
const mockReplace = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({ signIn: mockSignIn }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mockReplace }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mockSignIn.mockResolvedValue({ error: null });
  mockReplace.mockImplementation(() => undefined);
});

describe("LoginForm", () => {
  it("renders form with email and password inputs", () => {
    render(<LoginForm oauthProviders={{ google: false, github: false }} />);
    expect(screen.getByLabelText(/E-mail/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Пароль/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Войти в систему/i })).toBeInTheDocument();
  });

  it("shows OAuth buttons when providers exist", () => {
    render(<LoginForm oauthProviders={{ google: true, github: true }} />);
    expect(screen.getByRole("button", { name: "Google" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GitHub" })).toBeInTheDocument();
  });

  it("hides OAuth section when no providers", () => {
    render(<LoginForm oauthProviders={{ google: false, github: false }} />);
    expect(screen.queryByRole("button", { name: "Google" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "GitHub" })).not.toBeInTheDocument();
  });

  it("shows error alert after failed sign-in", async () => {
    mockSignIn.mockResolvedValue({ error: "Invalid credentials" });
    const user = userEvent.setup();

    render(<LoginForm oauthProviders={{ google: false, github: false }} />);

    await user.type(screen.getByLabelText(/E-mail/), "test@test.com");
    await user.type(screen.getByLabelText(/Пароль/), "wrong");
    await user.click(screen.getByRole("button", { name: /Войти в систему/i }));

    await waitFor(() => {
      expect(screen.getByText("Неверный логин или пароль")).toBeInTheDocument();
    });
  });

  it("redirects after successful sign-in", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: { path: "/admin" } }),
    });
    const user = userEvent.setup();

    render(<LoginForm oauthProviders={{ google: false, github: false }} />);

    await user.type(screen.getByLabelText(/E-mail/), "admin@test.com");
    await user.type(screen.getByLabelText(/Пароль/), "correct");
    await user.click(screen.getByRole("button", { name: /Войти в систему/i }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/admin");
    });

    vi.restoreAllMocks();
  });
});
