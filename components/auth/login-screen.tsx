"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LoginForm } from "@/components/auth/login-form";
import type { OAuthProviderFlags } from "@/server/auth/provider-flags";
import type { BrandingConfig } from "@/lib/branding";
import { BrandMark } from "@/components/layout/brand-mark";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export function LoginScreen({
  oauthProviders,
  reason,
  branding,
}: {
  oauthProviders: OAuthProviderFlags;
  reason?: "device-limit";
  branding: BrandingConfig;
}) {
  return (
    <main className="academy-login-shell relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-4 py-8 selection:bg-m3-primary/20 selection:text-m3-primary">
      {/* Animated mesh gradient background */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <motion.div
          className="absolute -inset-[50%] opacity-[0.06]"
          style={{
            background:
              "conic-gradient(from 180deg at 50% 50%, var(--m3-primary) 0%, var(--m3-tertiary) 30%, var(--m3-primary-container) 60%, var(--m3-primary) 100%)",
            backgroundSize: "200% 200%",
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 60, ease: "linear", repeat: Infinity }}
        />
      </motion.div>

      {/* Decorative ambient orbs */}
      <motion.div
        className="pointer-events-none absolute -left-24 -top-24 h-[480px] w-[480px] rounded-full opacity-[0.05]"
        style={{
          background: "radial-gradient(circle, var(--m3-primary-container) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.15, 1], x: [0, 20, 0] }}
        transition={{
          duration: 12,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-24 -right-24 h-[480px] w-[480px] rounded-full opacity-[0.05]"
        style={{
          background: "radial-gradient(circle, var(--m3-primary) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.2, 1], x: [0, -20, 0] }}
        transition={{
          duration: 14,
          ease: "easeInOut",
          repeat: Infinity,
          delay: 3,
        }}
      />

      <motion.div
        className="flex w-full max-w-[460px] flex-col items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="academy-login-panel flex w-full flex-col gap-lg rounded-2xl p-lg md:p-xl"
        >
          <div className="flex flex-col items-center gap-sm border-b border-m3-outline-variant/15 pb-lg text-center">
            <span className="rounded-full border border-m3-primary/15 bg-m3-primary/8 px-3 py-1 text-body-sm font-semibold text-m3-primary">
              закрытый вход
            </span>
            <div className="flex flex-col items-center gap-sm">
              <BrandMark branding={branding} size="lg" className="mb-sm" />
              <h1 className="text-headline-lg-mobile font-semibold text-gradient-primary md:text-headline-lg tracking-tight">
                {branding.name}
              </h1>
              <p className="text-body-md font-body-md text-m3-on-surface-variant/80">
                {branding.description}
              </p>
            </div>
          </div>

          {reason === "device-limit" ? (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.96 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden rounded-xl border border-rose-500/20 bg-rose-500/8 px-md py-sm text-body-sm font-body-sm text-rose-700 dark:text-rose-400 shadow-[0_0_16px_rgba(198,40,40,0.06)]"
              role="alert"
            >
              Сеанс завершен: под этой учетной записью выполнен вход на третьем устройстве. Доступ разрешен максимум с двух устройств; не передавайте логин и пароль третьим лицам.
            </motion.div>
          ) : null}

          <LoginForm oauthProviders={oauthProviders} />
        </motion.div>

        <motion.footer
          variants={itemVariants}
          className="mt-lg flex flex-wrap justify-center gap-x-md gap-y-xs rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest/50 px-4 py-3 text-body-sm font-body-sm text-m3-on-surface-variant/60 backdrop-blur-md"
        >
          <Link href="/privacy" className="transition-colors hover:text-m3-on-surface-variant hover:underline">
            Политика конфиденциальности
          </Link>
          <span className="hidden text-m3-outline-variant/40 md:inline">•</span>
          <Link href="/terms" className="transition-colors hover:text-m3-on-surface-variant hover:underline">
            Условия использования
          </Link>
          <span className="hidden text-m3-outline-variant/40 md:inline">•</span>
          <Link href="/docs/cookie-notice" className="transition-colors hover:text-m3-on-surface-variant hover:underline">
            Файлы Cookie
          </Link>
        </motion.footer>
      </motion.div>
    </main>
  );
}
