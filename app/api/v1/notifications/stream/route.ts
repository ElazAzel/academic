import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SELECT = {
  id: true,
  type: true,
  channel: true,
  title: true,
  body: true,
  data: true,
  refType: true,
  refId: true,
  status: true,
  readAt: true,
  createdAt: true,
} as const;

export async function GET(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since") || new Date(0).toISOString();
  const prisma = getPrisma();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      enqueue("connected", { userId: user.id });

      const poll = async () => {
        try {
          const notifications = await prisma.notification.findMany({
            where: { userId: user.id, createdAt: { gt: new Date(since) } },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: SELECT,
          });
          if (notifications.length > 0) {
            enqueue("notification", notifications);
          }
        } catch {
          // ignore poll errors
        }
      };

      const interval = setInterval(poll, 3000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
