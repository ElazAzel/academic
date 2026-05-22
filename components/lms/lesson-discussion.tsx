"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

/* ── Types ──────────────────────────────────────────────────────────── */

interface Post {
  id: string;
  text: string;
  parentId: string | null;
  userId: string;
  userName: string;
  userRole: string;
  createdAt: string;
  replies: Post[];
}

interface Discussion {
  lessonId: string;
  postCount: number;
  posts: Post[];
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "только что";
  if (diffMin < 60) return `${diffMin} мин. назад`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ч. назад`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} дн. назад`;

  return d.toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" });
}

function RoleBadge({ role }: { role: string }) {
  const labels: Record<string, string> = {
    admin: "Админ",
    instructor: "Преподаватель",
    curator: "Куратор",
    super_curator: "Супер-куратор",
    student: "Слушатель",
    customer_observer: "Наблюдатель",
  };
  const colors: Record<string, string> = {
    admin: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    instructor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    curator: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    super_curator: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    student: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    customer_observer: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  };

  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium leading-none", colors[role] ?? "bg-m3-surface-container-high text-m3-on-surface-variant")}>
      {labels[role] ?? role}
    </span>
  );
}

/* ── Post component ──────────────────────────────────────────────────── */

function PostCard({
  post,
  sessionUserId,
  lessonId,
  onReply,
  replyToId,
  replyText,
  setReplyText,
  submitReply,
  submitting,
  depth = 0,
}: {
  post: Post;
  sessionUserId: string;
  lessonId: string;
  onReply: (postId: string) => void;
  replyToId: string | null;
  replyText: string;
  setReplyText: (v: string) => void;
  submitReply: (parentId: string) => void;
  submitting: boolean;
  depth?: number;
}) {
  const isReplyOpen = replyToId === post.id;
  const isAuthor = sessionUserId === post.userId;

  return (
    <div className={cn("space-y-2", depth > 0 && "ml-8 border-l-2 border-m3-outline-variant/40 pl-4")}>
      <div className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-m3-surface-container-low">
        <Avatar name={post.userName} className="mt-0.5 h-8 w-8 shrink-0 text-xs" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label-sm font-label-sm text-m3-on-surface">{post.userName}</span>
            <RoleBadge role={post.userRole} />
            <span className="text-[11px] text-m3-on-surface-variant/60">{formatDate(post.createdAt)}</span>
          </div>
          <p className="whitespace-pre-wrap text-body-sm font-body-sm text-m3-on-surface-variant">
            {post.text}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onReply(post.id)}
              className="flex items-center gap-1 text-[11px] text-m3-on-surface-variant/50 transition-colors hover:text-m3-primary"
            >
              <Icon name="reply" size={12} />
              Ответить
            </button>
            {isAuthor && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/v1/lessons/${lessonId}/discussion/posts`, {
                      method: "DELETE",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ postId: post.id }),
                    });
                    if (res.ok) {
                      toast.success("Пост удалён");
                    } else {
                      const err = await res.json().catch(() => ({}));
                      toast.error(err.error?.message ?? "Не удалось удалить пост");
                    }
                  } catch {
                    toast.error("Ошибка сети");
                  }
                }}
                className="flex items-center gap-1 text-[11px] text-m3-on-surface-variant/50 transition-colors hover:text-destructive"
              >
                <Icon name="delete" size={12} />
                Удалить
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reply form inline */}
      {isReplyOpen && (
        <div className="ml-8 space-y-2 rounded-xl border border-m3-outline-variant bg-m3-surface-container-low p-3">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Напишите ответ..."
            rows={2}
            className="min-h-0 resize-none text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => submitReply(post.id)} disabled={!replyText.trim() || submitting}>
              {submitting ? "Отправка..." : "Ответить"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onReply("")}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      {/* Replies */}
      {post.replies.length > 0 && (
        <div className="space-y-1">
          {post.replies.map((reply) => (
            <PostCard
              key={reply.id}
              post={reply}
              sessionUserId={sessionUserId}
              lessonId={lessonId}
              onReply={onReply}
              replyToId={replyToId}
              replyText={replyText}
              setReplyText={setReplyText}
              submitReply={submitReply}
              submitting={submitting}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */

export function LessonDiscussion({ lessonId }: { lessonId: string }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [newPostText, setNewPostText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: discussion, isLoading, isError } = useQuery<Discussion>({
    queryKey: ["lesson-discussion", lessonId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/lessons/${lessonId}/discussion`);
      if (!res.ok) throw new Error("Failed to load discussion");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ text, parentId }: { text: string; parentId?: string }) => {
      const res = await fetch(`/api/v1/lessons/${lessonId}/discussion/posts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, parentId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? "Ошибка при отправке");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-discussion", lessonId] });
      setNewPostText("");
      setReplyText("");
      setReplyToId(null);
      toast.success("Сообщение опубликовано");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleSubmitNewPost = useCallback(() => {
    if (!newPostText.trim()) return;
    createMutation.mutate({ text: newPostText.trim() });
  }, [newPostText, createMutation]);

  const handleSubmitReply = useCallback(
    (parentId: string) => {
      if (!replyText.trim()) return;
      createMutation.mutate({ text: replyText.trim(), parentId });
    },
    [replyText, createMutation],
  );

  const sessionUserId = session?.user?.id ?? "";
  const postCount = discussion?.postCount ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-label-lg font-label-lg text-m3-on-surface">
          Обсуждение урока
          {postCount > 0 && (
            <span className="ml-2 text-label-md font-label-md text-m3-on-surface-variant">
              ({postCount} {postCount === 1 ? "сообщение" : postCount < 5 ? "сообщения" : "сообщений"})
            </span>
          )}
        </h3>
      </div>

      {/* New post form */}
      <div className="space-y-2 rounded-xl border border-m3-outline-variant bg-m3-surface-container-lowest p-4 shadow-m3-soft">
        <Textarea
          value={newPostText}
          onChange={(e) => setNewPostText(e.target.value)}
          placeholder="Напишите сообщение для обсуждения..."
          rows={3}
          className="resize-none text-sm"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmitNewPost}
            disabled={!newPostText.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "Отправка..." : "Опубликовать"}
          </Button>
        </div>
      </div>

      {/* Posts list */}
      <div className="space-y-1">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-body-md font-body-md text-m3-on-surface-variant">
            <span className="animate-pulse">Загрузка обсуждения...</span>
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center text-body-md font-body-md text-destructive">
            Не удалось загрузить обсуждение. Попробуйте позже.
          </div>
        )}

        {discussion && discussion.posts.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-body-md font-body-md text-m3-on-surface-variant">
            <Icon name="forum" size={32} className="text-m3-on-surface-variant/40" />
            <p>В этом уроке пока нет обсуждений.</p>
            <p className="text-body-sm font-body-sm">Будьте первым, кто напишет!</p>
          </div>
        )}

        {discussion?.posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            sessionUserId={sessionUserId}
            lessonId={lessonId}
            onReply={(id) => {
              setReplyToId((prev) => (prev === id ? null : id));
              setReplyText("");
            }}
            replyToId={replyToId}
            replyText={replyText}
            setReplyText={setReplyText}
            submitReply={handleSubmitReply}
            submitting={createMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}
