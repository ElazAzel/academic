import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { getCourseForStudent } from "@/server/modules/learning/service";

/* ── Types ──────────────────────────────────────────────────────────── */

export interface DiscussionPostOutput {
  id: string;
  text: string;
  parentId: string | null;
  userId: string;
  userName: string;
  userRole: string;
  createdAt: string;
  replies: DiscussionPostOutput[];
}

export interface DiscussionOutput {
  lessonId: string;
  postCount: number;
  posts: DiscussionPostOutput[];
}

/* ── Access helpers ─────────────────────────────────────────────────── */

async function assertLessonAccess(userId: string, lessonId: string) {
  const lesson = await getPrisma().lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, module: { select: { courseId: true } } },
  });
  if (!lesson) throw new ApiError("not_found", "Урок не найден", 404);

  // Проверяем доступ к курсу
  await getCourseForStudent(userId, lesson.module.courseId);
  return lesson;
}

/** Проверяет, что пользователь — instructor/admin курса (для модерации) */
async function isInstructorOrAdmin(userId: string, courseId: string): Promise<boolean> {
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { roles: { include: { role: { select: { key: true } } } } },
  });
  if (!user) return false;
  if (user.roles.some((r) => r.role.key === "admin")) return true;

  const instructor = await getPrisma().courseInstructor.findUnique({
    where: { courseId_userId: { courseId, userId } },
  });
  return !!instructor;
}

/** Извлекает первый role key из массива UserRole[] или "student" как fallback */
function getFirstRoleKey(
  roles: Array<{ role: { key: string } }>,
): string {
  return roles[0]?.role?.key ?? "student";
}

/* ── Mapper ─────────────────────────────────────────────────────────── */

type PostWithUser = {
  id: string;
  text: string;
  parentId: string | null;
  userId: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    roles: Array<{ role: { key: string } }>;
  };
  replies?: PostWithUser[];
};

function mapPost(post: PostWithUser): DiscussionPostOutput {
  return {
    id: post.id,
    text: post.text,
    parentId: post.parentId,
    userId: post.userId,
    userName: post.user.name ?? "Пользователь",
    userRole: getFirstRoleKey(post.user.roles),
    createdAt: post.createdAt.toISOString(),
    replies: (post.replies ?? []).map(mapPost),
  };
}

/* ── Service ────────────────────────────────────────────────────────── */

/**
 * Получить все обсуждение урока (список постов + replies).
 */
export async function getLessonDiscussion(userId: string, lessonId: string): Promise<DiscussionOutput> {
  await assertLessonAccess(userId, lessonId);

  const discussion = await getPrisma().lessonDiscussion.findUnique({
    where: { lessonId },
    include: {
      posts: {
        include: {
          user: { select: { id: true, name: true, roles: { include: { role: { select: { key: true } } } } } },
          replies: {
            include: {
              user: { select: { id: true, name: true, roles: { include: { role: { select: { key: true } } } } } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        where: { parentId: null },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!discussion) {
    return { lessonId, postCount: 0, posts: [] };
  }

  let totalCount = discussion.posts.length;
  for (const p of discussion.posts) {
    totalCount += p.replies.length;
  }

  return {
    lessonId,
    postCount: totalCount,
    posts: discussion.posts.map(mapPost),
  };
}

/**
 * Создать новый пост в обсуждении урока.
 */
export async function createDiscussionPost(
  userId: string,
  lessonId: string,
  text: string,
  parentId?: string,
): Promise<DiscussionPostOutput> {
  await assertLessonAccess(userId, lessonId);

  // Создаём discussion, если ещё нет (upsert)
  const discussion = await getPrisma().lessonDiscussion.upsert({
    where: { lessonId },
    create: { lessonId },
    update: {},
  });

  // Если parentId указан — проверяем, что родительский пост существует
  if (parentId) {
    const parent = await getPrisma().discussionPost.findUnique({
      where: { id: parentId },
      select: { id: true, discussionId: true },
    });
    if (!parent || parent.discussionId !== discussion.id) {
      throw new ApiError("bad_request", "Родительский пост не найден", 400);
    }
  }

  const newPost = await getPrisma().discussionPost.create({
    data: {
      discussionId: discussion.id,
      userId,
      text,
      parentId: parentId ?? null,
    },
    include: {
      user: { select: { id: true, name: true, roles: { include: { role: { select: { key: true } } } } } },
    },
  });

  // Обновляем updatedAt discussion
  await getPrisma().lessonDiscussion.update({
    where: { id: discussion.id },
    data: { updatedAt: new Date() },
  });

  // Создадим нотификацию для instructor/admin курса (опционально)
  return mapPost(newPost);
}

/**
 * Удалить пост (только автор или админ/инструктор курса).
 */
export async function deleteDiscussionPost(
  userId: string,
  lessonId: string,
  postId: string,
): Promise<void> {
  await assertLessonAccess(userId, lessonId);

  const post = await getPrisma().discussionPost.findUnique({
    where: { id: postId },
    select: {
      userId: true,
      discussion: {
        select: {
          lessonId: true,
          lesson: { select: { module: { select: { courseId: true } } } },
        },
      },
    },
  });
  if (!post) throw new ApiError("not_found", "Пост не найден", 404);
  if (post.discussion.lessonId !== lessonId) {
    throw new ApiError("not_found", "Пост не найден", 404);
  }

  const isAuthor = post.userId === userId;
  if (!isAuthor) {
    const isMod = await isInstructorOrAdmin(userId, post.discussion.lesson.module.courseId);
    if (!isMod) {
      throw new ApiError("forbidden", "Нет прав на удаление", 403);
    }
  }

  await getPrisma().discussionPost.delete({ where: { id: postId } });
}
