// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/auth/login-form";

const mockSignIn = vi.hoisted(() => vi.fn());
const mockReplace = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({ signIn: mockSignIn }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mockReplace }) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("scrollTo", vi.fn());
  mockSignIn.mockResolvedValue({ error: null });
  mockReplace.mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
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

  it("shows an accessible error alert after failed sign-in", async () => {
    mockSignIn.mockResolvedValue({ error: "Invalid credentials" });
    const user = userEvent.setup();

    render(<LoginForm oauthProviders={{ google: false, github: false }} />);

    await user.type(screen.getByLabelText(/E-mail/), "test@test.com");
    await user.type(screen.getByLabelText(/Пароль/), "wrong");
    await user.click(screen.getByRole("button", { name: /Войти в систему/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Неверный логин или пароль");
    expect(alert).toHaveAttribute("id", "login-form-error");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveAttribute("aria-atomic", "true");
    expect(alert).toHaveFocus();

    expect(screen.getByLabelText(/E-mail/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/E-mail/)).toHaveAttribute("aria-describedby", "login-form-error");
    expect(screen.getByLabelText(/Пароль/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Пароль/)).toHaveAttribute("aria-describedby", "login-form-error");
  });

  it("redirects after successful sign-in", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ user: { roles: ["admin"] } }),
    }));
    const user = userEvent.setup();

    render(<LoginForm oauthProviders={{ google: false, github: false }} />);

    await user.type(screen.getByLabelText(/E-mail/), "admin@test.com");
    await user.type(screen.getByLabelText(/Пароль/), "correct");
    await user.click(screen.getByRole("button", { name: /Войти в систему/i }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/admin");
    });
  });

  it("retries session roles before redirecting", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ user: { roles: [] } }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ user: { roles: ["curator"] } }),
      });
    vi.stubGlobal("fetch", mockFetch);
    const user = userEvent.setup();

    render(<LoginForm oauthProviders={{ google: false, github: false }} />);

    await user.type(screen.getByLabelText(/E-mail/), "curator@test.com");
    await user.type(screen.getByLabelText(/Пароль/), "correct");
    await user.click(screen.getByRole("button", { name: /Войти в систему/i }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/curator");
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
