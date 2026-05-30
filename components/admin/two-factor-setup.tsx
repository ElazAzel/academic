"use client";

import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

type Step = "loading" | "setup" | "verify" | "backup-codes" | "done";

export default function TwoFactorSetup() {
  const [step, setStep] = useState<Step>("loading");
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function checkStatus() {
    try {
      const res = await fetch("/api/v1/auth/2fa/status");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIsEnabled(data.enabled);
      setStep(data.enabled ? "done" : "setup");
    } catch {
      setStep("setup");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkStatus();
  }, []);

  async function handleSetup() {
    setError("");
    try {
      const res = await fetch("/api/v1/auth/2fa/setup", { method: "POST" });
      if (!res.ok) {
        setError("Ошибка при получении настроек");
        return;
      }
      const data = await res.json();
      setSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
      setStep("verify");
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch {
      setError("Ошибка сети");
    }
  }

  async function handleVerify() {
    setError("");
    if (token.length < 6) {
      setError("Введите 6-значный код");
      return;
    }
    try {
      const res = await fetch("/api/v1/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, token }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Неверный код");
        return;
      }
      // Use server-generated backup codes (cryptographically secure)
      const verifyResult = await res.json();
      setBackupCodes(verifyResult.backupCodes ?? []);
      // Clear TOTP secret from state — больше не нужен
      setSecret("");
      setOtpauthUrl("");
      setStep("backup-codes");
    } catch {
      setError("Ошибка сети");
    }
  }

  function handleDone() {
    setIsEnabled(true);
    setStep("done");
  }

  function copyCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDisable(password: string) {
    setError("");
    try {
      const res = await fetch("/api/v1/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка отключения");
        return;
      }
      setIsEnabled(false);
      setStep("setup");
    } catch {
      setError("Ошибка сети");
    }
  }

  if (step === "loading") {
    return <div className="p-6">Загрузка...</div>;
  }

  if (step === "done" && isEnabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-600">
          <span className="i-lucide-shield-check h-5 w-5" />
          <span className="font-medium">Двухфакторная аутентификация включена</span>
        </div>
        <p className="text-sm text-muted-foreground">
          При входе в аккаунт потребуется код из приложения-аутентификатора.
        </p>
        <DisableForm onDisable={handleDisable} error={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Двухфакторная аутентификация</h3>
        <p className="text-sm text-muted-foreground">
          Защитите аккаунт с помощью TOTP-приложения (Google Authenticator, Authy, 1Password)
        </p>
      </div>

      {step === "setup" && (
        <div>
          <button
            onClick={handleSetup}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Настроить
          </button>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <QRCodeSVG value={otpauthUrl} size={200} />
          </div>
          <p className="text-center text-xs text-muted-foreground break-all font-mono">
            {secret}
          </p>
          <p className="text-sm">
            Отсканируйте QR-код в приложении-аутентификаторе, затем введите код:
          </p>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={token}
            onChange={(e) => {
              setToken(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            placeholder="000000"
            className="w-32 rounded-md border px-3 py-2 text-center text-lg tracking-widest"
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={handleVerify}
            disabled={token.length < 6}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Подтвердить
          </button>
        </div>
      )}

      {step === "backup-codes" && (
        <div className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
            <p className="font-medium text-amber-800">Сохраните резервные коды</p>
            <p className="mt-1 text-sm text-amber-700">
              Каждый код можно использовать один раз для входа без приложения.
              Коды больше не будут показаны.
            </p>
          </div>
          <div className="rounded-md bg-muted p-4 font-mono text-sm">
            {backupCodes.map((code, i) => (
              <div key={i} className="py-0.5">{code}</div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyCodes}
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              {copied ? "Скопировано" : "Копировать"}
            </button>
            <button
              onClick={handleDone}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Готово
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DisableForm({
  onDisable,
  error,
}: {
  onDisable: (password: string) => Promise<void>;
  error: string;
}) {
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-2 border-t pt-4">
      <label htmlFor="password" className="text-sm font-medium">Введите пароль для отключения</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="block w-full max-w-xs rounded-md border px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        onClick={() => onDisable(password)}
        disabled={!password}
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Отключить 2FA
      </button>
    </div>
  );
}
