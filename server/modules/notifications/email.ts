import { env } from "@/lib/env";

let nodemailerTransporter: { sendMail: (opts: Record<string, unknown>) => Promise<unknown> } | null = null;

async function getMailer() {
  if (!env.FEATURE_EMAIL_NOTIFICATIONS) return null;
  if (nodemailerTransporter) return nodemailerTransporter;
  try {
    const nodemailer = await import("nodemailer");
    nodemailerTransporter = nodemailer.default.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      pool: true,
      maxConnections: 5,
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      logger: true,
      auth: env.SMTP_USER
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD ?? "",
          }
        : undefined,
    });
    return nodemailerTransporter;
  } catch {
    return null;
  }
}

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const mailer = await getMailer();
  if (!mailer) return;
  return mailer.sendMail({ from: env.EMAIL_FROM, to, subject, text, html: html || text });
}
