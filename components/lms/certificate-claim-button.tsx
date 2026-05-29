"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type CertificateClaimButtonProps = {
  courseId: string;
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost";
};

async function readErrorMessage(response: Response) {
  const fallback = "Не удалось оформить сертификат. Попробуйте ещё раз.";
  const text = await response.text();
  if (!text) return fallback;

  try {
    const payload = JSON.parse(text) as { error?: { message?: string } };
    return payload.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export function CertificateClaimButton({
  courseId,
  className,
  label = "Получить сертификат",
  size = "sm",
  variant = "primary",
}: CertificateClaimButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claimCertificate() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/certificates/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      if (response.ok || response.status === 409) {
        router.push("/student/certificates");
        router.refresh();
        return;
      }

      setError(await readErrorMessage(response));
    } catch {
      setError("Сертификат не оформлен: нет ответа от сервера.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={isSubmitting}
        onClick={claimCertificate}
      >
        <Icon name="award_star" size={16} aria-hidden="true" />
        {isSubmitting ? "Оформляем сертификат..." : label}
      </Button>
      {error && (
        <p role="alert" className="text-label-md font-label-md text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
