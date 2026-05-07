"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppSessionUser } from "@/types/domain";

export function UserAccountNav({ user }: { user: AppSessionUser }) {
  return (
    <div className="flex items-center gap-4">
      <div className="hidden flex-col items-end sm:flex">
        <p className="text-sm font-medium leading-none">{user.name || "Пользователь"}</p>
        <p className="text-xs leading-none text-muted-foreground">
          {user.email}
        </p>
      </div>
      <Button 
        variant="ghost" 
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Выйти
      </Button>
    </div>
  );
}
