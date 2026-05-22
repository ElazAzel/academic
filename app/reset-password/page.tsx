import { redirect } from "next/navigation";
import { AUTH_ROUTES } from "@/lib/constants";

export default function ResetPasswordPage() {
  redirect(AUTH_ROUTES.FORGOT_PASSWORD);
}
