"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, UserPlus } from "lucide-react";
import { CreateUserModal } from "./create-user-modal";
import { RoleKey } from "@/types/domain";

export function UserManagementToolbar({ assignableRoles }: { assignableRoles: RoleKey[] }) {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus className="h-4 w-4" />Добавить вручную
        </Button>
        <Button variant="secondary" disabled>
          <Upload className="h-4 w-4" />Импорт из Excel
        </Button>
        <Button variant="secondary" disabled>
          <Download className="h-4 w-4" />Экспорт CSV
        </Button>
      </div>

      {showAddModal && (
        <CreateUserModal 
          assignableRoles={assignableRoles} 
          onClose={() => setShowAddModal(false)} 
        />
      )}
    </>
  );
}
