"use client";

import { useState, useEffect, useCallback } from "react";
import { getQuestionSuggestionsAction } from "@/server/actions/assistant";
import type { Suggestion } from "@/server/modules/nlp/suggestions";
import { Lightbulb, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface QuestionAssistantProps {
  questionText: string;
  onSelectSuggestion: (text: string) => void;
}

export function QuestionAssistant({ questionText, onSelectSuggestion }: QuestionAssistantProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    if (!questionText || questionText.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const result = await getQuestionSuggestionsAction(questionText);
      setSuggestions(result);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [questionText]);

  useEffect(() => {
    const timer = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(timer);
  }, [fetchSuggestions]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
        <Loader2 className="h-3 w-3 animate-spin" />
        Поиск подсказок из глоссария...
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100/50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5" />
          Подсказки из глоссария ({suggestions.length})
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {expanded && (
        <div className="divide-y divide-blue-200/50">
          {suggestions.map((s) => (
            <div key={s.id} className="px-3 py-2.5 space-y-1">
              <p className="text-[11px] font-medium text-blue-600 leading-tight">
                {s.question}
              </p>
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">
                {s.answer}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-blue-400">
                  {s.category} · {s.direction}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectSuggestion(s.answer)}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  Вставить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
