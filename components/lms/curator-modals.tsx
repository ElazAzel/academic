"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { answerQuestionAction, forwardQuestionAction, reviewSubmissionAction, markSubmissionInReview } from "@/server/actions/curator";
import { Loader2, CheckCircle2, XCircle, RotateCcw, Share2, File } from "lucide-react";
import { toast } from "sonner";
import { QuestionAssistant } from "@/components/curator/question-assistant";

// --- Модалка ответа на вопрос ---
export function AnswerQuestionModal({ 
  question, 
  onClose 
}: { 
  question: { id: string; text: string; studentName: string }; 
  onClose: () => void 
}) {
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState(false);

  async function handleAnswer() {
    setPending(true);
    try {
      await answerQuestionAction(question.id, answer);
      onClose();
    } catch {
      toast.error("Ошибка при сохранении ответа");
    } finally {
      setPending(false);
    }
  }

  async function handleForward() {
    setPending(true);
    try {
      await forwardQuestionAction(question.id);
      onClose();
    } catch {
      toast.error("Ошибка при передаче вопроса");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" style={{ overscrollBehavior: "contain" }}>
      <div className="w-full max-w-lg overflow-hidden rounded-lg border border-m3-outline-variant bg-card shadow-m3-modal animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold">Ответ на вопрос</h3>
          <p className="text-sm text-muted-foreground">Слушатель: {question.studentName}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-sm italic text-muted-foreground">
            &quot;{question.text}&quot;
          </div>

          <QuestionAssistant
            questionText={question.text}
            onSelectSuggestion={(text) => setAnswer(text)}
          />

          <div className="space-y-2">
            <label htmlFor="answer" className="text-xs font-semibold uppercase uppercase-tracking text-muted-foreground">Ваш ответ</label>
            <textarea
              id="answer"
              className="min-h-[150px] w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Введите ответ студенту..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>
        </div>
        <div className="p-6 bg-muted/20 flex gap-3 justify-end">
          <Button variant="ghost" onClick={handleForward} disabled={pending} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
            <Share2 className="h-4 w-4 mr-2" /> Эксперту
          </Button>
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose} disabled={pending}>Отмена</Button>
          <Button onClick={handleAnswer} disabled={pending || !answer.trim()}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Отправить ответ"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Модалка проверки задания ---
export function ReviewSubmissionModal({ 
  submission, 
  onClose 
}: { 
  submission: { id: string; studentName: string; assignmentTitle: string; answerText?: string | null; fileUrl?: string | null; lessonTitle?: string; courseTitle?: string }; 
  onClose: () => void 
}) {
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState(100);
  const [pending, setPending] = useState(false);

  // Mark as IN_REVIEW when modal opens
  useEffect(() => {
    markSubmissionInReview(submission.id).catch(() => {
      // Silently fail — non-critical status update
    });
  }, [submission.id]);

  async function handleReview(status: "ACCEPTED" | "REJECTED" | "NEEDS_REVISION") {
    setPending(true);
    try {
      await reviewSubmissionAction(submission.id, { status, score, feedback });
      onClose();
    } catch {
      toast.error("Ошибка при сохранении проверки");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" style={{ overscrollBehavior: "contain" }}>
      <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-m3-outline-variant bg-card shadow-m3-modal animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Проверка задания</h3>
            <p className="text-sm text-muted-foreground">{submission.studentName} · {submission.assignmentTitle}</p>
            {submission.courseTitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{submission.courseTitle}{submission.lessonTitle ? ` → ${submission.lessonTitle}` : ""}</p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">×</button>
        </div>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase uppercase-tracking text-muted-foreground">Ответ студента</span>
            <div className="rounded-lg border bg-muted/30 p-5 text-sm leading-relaxed whitespace-pre-wrap">
              {submission.answerText || "Текст ответа отсутствует"}
            </div>
          </div>

          {submission.fileUrl ? (
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="mb-2 text-xs font-semibold uppercase uppercase-tracking text-muted-foreground">Прикреплённый файл:</p>
              <div className="flex items-center gap-2">
                <File className="h-5 w-5 text-primary" />
                <a
                  href={submission.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Открыть/Скачать файл
                </a>
              </div>
            </div>
          ) : null}
          
          <div className="space-y-2">
            <label htmlFor="score" className="text-xs font-semibold uppercase uppercase-tracking text-muted-foreground">Балл (0-100)</label>
            <Input 
              id="score"
              type="number" 
              value={score} 
              onChange={(e) => setScore(Number(e.target.value))} 
              min={0} max={100}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="feedback" className="text-xs font-semibold uppercase uppercase-tracking text-muted-foreground">Комментарий (feedback)</label>
            <textarea
              id="feedback"
              className="min-h-[100px] w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Напишите замечания или похвалу..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
        </div>
        <div className="p-6 bg-muted/20 flex flex-wrap gap-3 justify-end">
          <Button variant="ghost" onClick={() => handleReview("REJECTED")} disabled={pending} className="text-rose-600 border border-rose-200 hover:bg-rose-50 hover:text-rose-700">
            <XCircle className="h-4 w-4 mr-2" /> Отклонить
          </Button>
          <Button variant="ghost" onClick={() => handleReview("NEEDS_REVISION")} disabled={pending} className="text-amber-600 border border-amber-200 hover:bg-amber-50 hover:text-amber-700">
            <RotateCcw className="h-4 w-4 mr-2" /> На доработку
          </Button>
          <Button onClick={() => handleReview("ACCEPTED")} disabled={pending} className="bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Зачесть задание
          </Button>
        </div>
      </div>
    </div>
  );
}
