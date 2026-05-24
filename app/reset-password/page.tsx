import { redirect } from "next/navigation";
import { AUTH_ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Сброс пароля",
  description: "Сбросьте пароль от своей учётной записи.",
};


export default function ResetPasswordPage() {
  redirect(AUTH_ROUTES.FORGOT_PASSWORD);
}
