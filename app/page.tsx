import { redirect } from "next/navigation";
import { AUTH_ROUTES } from "@/lib/constants";

export default function HomePage() {
  redirect(AUTH_ROUTES.LOGIN);
}
