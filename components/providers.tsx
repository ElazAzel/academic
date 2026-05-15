"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Toaster } from "sonner";
import { CommandPalette } from "@/components/lms/command-palette";
import { PopupModal } from "@/components/lms/popup-modal";
import { PWAInstallPrompt } from "@/components/lms/pwa-install-prompt";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="top-right" richColors closeButton
            toastOptions={{ duration: 5000 }} />
          <CommandPalette />
          <PopupModal />
          <PWAInstallPrompt />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
