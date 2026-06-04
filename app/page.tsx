import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AUTH_ROUTES } from "@/lib/constants";
import { getRuntimeBranding } from "@/server/modules/branding/service";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getRuntimeBranding();
  return {
    title: branding.name,
    description: branding.metadataDescription,
  };
}


export default function HomePage() {
  redirect(AUTH_ROUTES.LOGIN);
}
