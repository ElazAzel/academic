"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { answerQuestionAction, reviewSubmissionAction } from "@/server/actions/curator";
import { Loader2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

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
    } catch (err) {
      alert("Ошибка при сохранении ответа");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold">Ответ на вопрос</h3>
          <p className="text-sm text-muted-foreground">Слушатель: {question.studentName}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-muted/50 p-4 rounded-2xl italic text-sm text-muted-foreground">
            "{question.text}"
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Ваш ответ</label>
            <textarea
              className="w-full min-h-[150px] rounded-2xl border bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Введите ответ студенту..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>
        </div>
        <div className="p-6 bg-muted/20 flex gap-3 justify-end">
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
  submission: { id: string; studentName: string; assignmentTitle: string; answerText?: string }; 
  onClose: () => void 
}) {
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState(100);
  const [pending, setPending] = useState(false);

  async function handleReview(status: "ACCEPTED" | "REJECTED" | "NEEDS_REVISION") {
    setPending(true);
    try {
      await reviewSubmissionAction(submission.id, { status, score, feedback });
      onClose();
    } catch (err) {
      alert("Ошибка при сохранении проверки");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Проверка задания</h3>
            <p className="text-sm text-muted-foreground">{submission.studentName} · {submission.assignmentTitle}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">×</button>
        </div>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Ответ студента</label>
            <div className="bg-muted/30 p-5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap border">
              {submission.answerText || "Текст ответа отсутствует"}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Балл (0-100)</label>
              <Input 
                type="number" 
                value={score} 
                onChange={(e) => setScore(Number(e.target.value))} 
                min={0} max={100}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Комментарий (feedback)</label>
            <textarea
              className="w-full min-h-[100px] rounded-2xl border bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Напишите замечания или похвалу..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
        </div>
        <div className="p-6 bg-muted/20 flex flex-wrap gap-3 justify-end">
          <Button variant="outline" onClick={() => handleReview("REJECTED")} disabled={pending} className="text-rose-600 border-rose-200 hover:bg-rose-50">
            <XCircle className="h-4 w-4" /> Отклонить
          </Button>
          <Button variant="outline" onClick={() => handleReview("NEEDS_REVISION")} disabled={pending} className="text-amber-600 border-amber-200 hover:bg-amber-50">
            <RotateCcw className="h-4 w-4" /> На доработку
          </Button>
          <Button onClick={() => handleReview("ACCEPTED")} disabled={pending} className="bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Зачесть задание
          </Button>
        </div>
      </div>
    </div>
  );
}
