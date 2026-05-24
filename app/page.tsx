import { redirect } from "next/navigation";
import { AUTH_ROUTES } from "@/lib/constants";

export const metadata = {
  title: "AI Strategic Academy",
  description: "Закрытая LMS академии для AI-стратегии, обучения и аналитики.",
};


export default function HomePage() {
  redirect(AUTH_ROUTES.LOGIN);
}
