"use client";

import { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AUTH_ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Двухфакторная аутентификация",
  description: "Подтвердите вход с помощью кода 2FA.",
};


type Mode = "totp" | "backup";

export default function TwoFactorAuthPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<Mode>("totp");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If user doesn't need 2FA anymore, redirect to home
    if (session && !session.requires2fa) {
      const roles = (session.user?.roles as string[]) ?? [];
      const homePath =
        roles.includes("admin")
          ? "/admin"
          : roles.includes("super_curator")
            ? "/super-curator"
            : roles.includes("curator")
              ? "/curator"
              : roles.includes("instructor")
                ? "/instructor"
                : roles.includes("customer_observer")
                  ? "/customer-observer"
                  : "/student";
      router.push(homePath);
    }
  }, [session, router]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body =
        mode === "backup"
          ? { backupCode: code.toUpperCase() }
          : { token: code };

      const res = await fetch("/api/v1/auth/2fa/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Неверный код. Попробуйте снова.");
        setLoading(false);
        return;
      }

      // Success — update session and redirect
      await update();
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте снова.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Двухфакторная аутентификация</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "totp"
              ? "Введите код из приложения-аутентификатора"
              : "Введите резервный код"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              ref={inputRef}
              type="text"
              inputMode={mode === "totp" ? "numeric" : "text"}
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\s/g, ""));
                setError("");
              }}
              placeholder={mode === "totp" ? "000000" : "XXXXXXXX"}
              maxLength={mode === "totp" ? 6 : 8}
              className="w-full rounded-md border px-4 py-3 text-center text-xl tracking-[0.5em]"
              disabled={loading}
            />
            {error && (
              <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={code.length < (mode === "totp" ? 6 : 1) || loading}
            className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Проверка..." : "Подтвердить"}
          </button>
        </form>

        <div className="text-center space-y-2">
          {mode === "totp" ? (
            <button
              onClick={() => {
                setMode("backup");
                setCode("");
                setError("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Использовать резервный код
            </button>
          ) : (
            <button
              onClick={() => {
                setMode("totp");
                setCode("");
                setError("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Вернуться к коду из приложения
            </button>
          )}

          <div>
            <button
              onClick={() =>
                signOut({ callbackUrl: AUTH_ROUTES.LOGIN, redirect: true })
              }
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Выйти и войти заново
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
