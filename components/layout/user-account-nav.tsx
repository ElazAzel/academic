"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LayoutDashboard, LogOut, Settings, User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ROLE_HOME_PATH } from "@/lib/auth/role-redirect";
import { ROLE_LABELS } from "@/types/domain";
import type { AppSessionUser, RoleKey } from "@/types/domain";

export function UserAccountNav({ user }: { user: AppSessionUser }) {
  const primaryRole = (["admin", "super_curator", "curator", "instructor", "customer_observer", "student"] as RoleKey[]).find((r) =>
    user.roles.includes(r)
  );
  const homePath = primaryRole ? ROLE_HOME_PATH[primaryRole] : "/403";
  const roleLabel = primaryRole ? ROLE_LABELS[primaryRole] : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-muted outline-none">
          <Avatar name={user.name || user.email} className="h-8 w-8 text-xs" />
          <div className="hidden flex-col items-start sm:flex">
            <p className="text-sm font-medium leading-none">{user.name || "Пользователь"}</p>
            <p className="text-xs leading-none text-muted-foreground">{roleLabel}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex items-center gap-3">
            <Avatar name={user.name || user.email} />
            <div>
              <p className="text-sm font-medium">{user.name || "Пользователь"}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={homePath}>
            <LayoutDashboard className="h-4 w-4" />
            Дашборд
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`${homePath}/settings`}>
            <Settings className="h-4 w-4" />
            Настройки
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-4 w-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
