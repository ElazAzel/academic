"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type RoleKey } from "@/types/domain";

export function UserRoleEditor({
  userId,
  initialRoles,
  assignableRoles
}: {
  userId: string;
  initialRoles: RoleKey[];
  assignableRoles: RoleKey[];
}) {
  const [selectedRoles, setSelectedRoles] = useState<RoleKey[]>(initialRoles);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  function toggleRole(role: RoleKey) {
    setMessage("");
    setSelectedRoles((current) => {
      if (current.includes(role)) {
        return current.length === 1 ? current : current.filter((item) => item !== role);
      }
      return [...current, role];
    });
  }

  async function saveRoles() {
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/v1/users/${userId}/roles`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roles: selectedRoles })
    });
    setPending(false);
    setMessage(response.ok ? "Роли сохранены" : "Не удалось сохранить роли");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {assignableRoles.map((role) => (
          <label
            key={role}
            className="flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted"
          >
            <input
              type="checkbox"
              checked={selectedRoles.includes(role)}
              onChange={() => toggleRole(role)}
              className="h-3 w-3"
            />
            {ROLE_LABELS[role]}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={saveRoles} disabled={pending}>
          {pending ? "Сохраняем..." : "Сохранить роли"}
        </Button>
        {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
      </div>
    </div>
  );
}
