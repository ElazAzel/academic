"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Toaster } from "sonner";
import { CommandPalette } from "@/components/lms/command-palette";
import { PopupModal } from "@/components/lms/popup-modal";
import { ConsentModal } from "@/components/lms/consent-modal";
import { NotificationToast } from "@/components/lms/notification-toast";
import { PWAInstallPrompt } from "@/components/lms/pwa-install-prompt";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="top-right" closeButton
            toastOptions={{
              duration: 5000,
              classNames: {
                toast: "!bg-card !text-card-foreground !border !border-border !shadow-panel !rounded-2xl !p-4",
                title: "!text-foreground !font-medium !text-sm",
                description: "!text-muted-foreground !text-xs",
                actionButton: "!bg-primary !text-primary-foreground !rounded-xl !text-xs !font-medium !h-8 !px-3",
                cancelButton: "!text-muted-foreground !hover:text-foreground !text-xs",
                closeButton: "!text-muted-foreground !hover:text-foreground",
              },
            }} />
          <CommandPalette />
          <PopupModal />
          <ConsentModal />
          <NotificationToast />
          <PWAInstallPrompt />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
