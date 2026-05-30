"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LoginForm } from "@/components/auth/login-form";
import type { OAuthProviderFlags } from "@/server/auth/provider-flags";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
};

export function LoginScreen({
  oauthProviders,
  reason,
}: {
  oauthProviders: OAuthProviderFlags;
  reason?: "device-limit";
}) {
  return (
    <main className="academy-login-shell relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-4 py-8 selection:bg-m3-primary/20 selection:text-m3-primary">
      {/* Animated gradient background */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <motion.div
          className="absolute -inset-[100%] opacity-[0.07]"
          style={{
            background:
              "linear-gradient(135deg, #163f82 0%, #7c4dff 50%, #163f82 100%)",
            backgroundSize: "400% 400%",
          }}
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 20, ease: "linear", repeat: Infinity }}
        />
      </motion.div>

      {/* Decorative pulsing orbs */}
      <motion.div
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-[0.04]"
        style={{
          background: "radial-gradient(circle, #7c4dff 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{
          duration: 8,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-[0.04]"
        style={{
          background: "radial-gradient(circle, #163f82 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{
          duration: 10,
          ease: "easeInOut",
          repeat: Infinity,
          delay: 2,
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
          className="academy-login-panel flex w-full flex-col gap-lg rounded-lg p-lg md:p-xl"
        >
          <div className="flex flex-col items-center gap-sm border-b border-m3-outline-variant/25 pb-lg text-center">
            <span className="rounded-full border border-m3-primary/20 bg-m3-primary-fixed/45 px-3 py-1 text-body-sm font-semibold text-m3-primary">
              закрытый вход
            </span>
            <div className="flex flex-col items-center gap-sm">
              <div className="academy-brand-mark mb-sm flex h-14 w-14 items-center justify-center rounded-lg text-white">
                <span
                  className="material-symbols-outlined text-[28px] text-white"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  school
                </span>
              </div>
              <h1 className="text-headline-lg-mobile font-semibold text-m3-primary md:text-headline-lg">
                AI Strategic Academy
              </h1>
              <p className="text-body-md font-body-md text-m3-on-surface-variant">
                Закрытая образовательная платформа
              </p>
            </div>
          </div>

          {reason === "device-limit" ? (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden rounded-lg border border-m3-error/30 bg-m3-error-container/70 px-md py-sm text-body-sm font-body-sm text-m3-error shadow-[0_8px_18px_rgba(186,26,26,0.08)]"
              role="alert"
            >
              Сеанс завершен: под этой учетной записью выполнен вход на третьем устройстве. Доступ разрешен максимум с двух устройств; не передавайте логин и пароль третьим лицам.
            </motion.div>
          ) : null}

          <LoginForm oauthProviders={oauthProviders} />
        </motion.div>

        <motion.footer
          variants={itemVariants}
          className="mt-lg flex flex-wrap justify-center gap-x-md gap-y-xs rounded-lg border border-m3-outline-variant/45 bg-m3-surface-container-lowest/70 px-4 py-3 text-body-sm font-body-sm text-m3-on-surface-variant/80 backdrop-blur"
        >
          <Link href="/privacy" className="transition-colors hover:text-m3-primary hover:underline">
            Политика конфиденциальности
          </Link>
          <span className="hidden text-m3-outline-variant md:inline">•</span>
          <Link href="/terms" className="transition-colors hover:text-m3-primary hover:underline">
            Условия использования
          </Link>
          <span className="hidden text-m3-outline-variant md:inline">•</span>
          <Link href="/docs/cookie-notice" className="transition-colors hover:text-m3-primary hover:underline">
            Файлы Cookie
          </Link>
        </motion.footer>
      </motion.div>
    </main>
  );
}
