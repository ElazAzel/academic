"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteEnrollmentAction } from "@/server/actions/admin";
import {
  DELETE_ENROLLMENT_ERROR,
  getSafeEnrollmentActionError,
  readEnrollmentActionResultError,
} from "@/components/admin/enrollment-action-errors";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteEnrollmentButton({ enrollmentId }: { enrollmentId: string }) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm("Вы уверены, что хотите удалить это зачисление? Это также удалит прогресс студента в этом курсе.")) {
      return;
    }
    
    setPending(true);
    try {
      const result = await deleteEnrollmentAction(enrollmentId);
      if (!result.success) {
        toast.error(readEnrollmentActionResultError(result, DELETE_ENROLLMENT_ERROR));
      }
    } catch (err) {
      toast.error(getSafeEnrollmentActionError(err, DELETE_ENROLLMENT_ERROR));
    } finally {
      setPending(false);
    }
  }

  return (
    <Button 
      size="sm" 
      variant="ghost" 
      onClick={handleDelete} 
      disabled={pending}
      aria-label="Удалить зачисление"
      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
