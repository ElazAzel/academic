"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { reviewSubmissionAction } from "@/server/actions/curator";
import { toast } from "sonner";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";

interface ReviewFormSubmission {
  id: string;
  status: string;
  score: number | null;
  feedback: string | null;
  assignment: { maxScore: number; maxAttempts: number };
}

export function ReviewSubmissionForm({ submission }: { submission: ReviewFormSubmission }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [score, setScore] = useState(submission.score ?? submission.assignment.maxScore);
  const [pending, setPending] = useState(false);

  async function handleReview(status: "ACCEPTED" | "REJECTED" | "NEEDS_REVISION") {
    setPending(true);
    try {
      await reviewSubmissionAction(submission.id, { status, score, feedback });
      toast.success("Проверка сохранена");
      router.refresh();
    } catch {
      toast.error("Ошибка при сохранении проверки");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
      <CardHeader className="pb-3">
        <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Проверка задания</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-label-sm font-label-sm text-m3-on-surface-variant">Балл (0–{submission.assignment.maxScore})</label>
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            min={0}
            max={submission.assignment.maxScore}
            className="w-full max-w-[120px] rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-3 py-2 text-body-md font-body-md text-m3-on-surface outline-none focus:ring-2 focus:ring-m3-outline"
          />
        </div>

        <div className="space-y-2">
          <label className="text-label-sm font-label-sm text-m3-on-surface-variant">Комментарий</label>
          <textarea
            className="w-full min-h-[120px] resize-y rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-3 py-2 text-body-md font-body-md text-m3-on-surface outline-none focus:ring-2 focus:ring-m3-outline"
            placeholder="Напишите замечания или похвалу..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={() => handleReview("REJECTED")}
            disabled={pending}
            className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Отклонить
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleReview("NEEDS_REVISION")}
            disabled={pending}
            className="border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            На доработку
          </Button>
          <Button
            onClick={() => handleReview("ACCEPTED")}
            disabled={pending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {pending ? "Сохранение..." : "Зачесть задание"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
