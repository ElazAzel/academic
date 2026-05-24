"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Icon } from "@/components/ui/icon";
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
import { AUTH_ROUTES, FORBIDDEN_ROUTE } from "@/lib/constants";
import type { AppSessionUser, RoleKey } from "@/types/domain";

export function UserAccountNav({ user }: { user: AppSessionUser }) {
  const primaryRole = (["admin", "super_curator", "curator", "instructor", "customer_observer", "student"] as RoleKey[]).find((r) =>
    user.roles.includes(r)
  );
  const homePath = primaryRole ? ROLE_HOME_PATH[primaryRole] : FORBIDDEN_ROUTE;
  const roleLabel = primaryRole ? ROLE_LABELS[primaryRole] : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted outline-none">
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
            <Icon name="dashboard" size={16} />
            Дашборд
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`${homePath}/settings`}>
            <Icon name="settings" size={16} />
            Настройки
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: AUTH_ROUTES.LOGIN })}>
          <Icon name="logout" size={16} />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
