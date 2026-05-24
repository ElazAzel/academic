import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** Скелет для операционных метрик */
export function MetricGridSkeleton() {
  return (
    <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="rounded-lg border-l-4 border-l-m3-outline-variant">
          <CardHeader className="pb-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-11 w-20" />
            <Skeleton className="mt-2 h-3 w-28" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

/** Скелет для карточки "Продолжить обучение" */
export function ContinueLearningSkeleton() {
  return (
    <Card className="overflow-hidden rounded-lg">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-64 mt-1" />
        <Skeleton className="h-4 w-48 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-9 w-32" />
      </CardContent>
    </Card>
  );
}

/** Скелет для сетки курсов */
export function CourseGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="rounded-lg">
          <CardHeader>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-full mt-2" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Скелет для списка вопросов */
export function QuestionsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="rounded-lg">
          <CardContent className="flex items-start gap-4 py-4">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Скелет для таблицы сабмишенов */
export function SubmissionsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-20 ml-auto" />
        </div>
      ))}
    </div>
  );
}

/** Скелет для списка рисков */
export function RisksListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="rounded-lg">
          <CardContent className="flex items-center gap-4 py-4">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Скелет для таблицы кураторов */
export function CuratorTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 rounded-lg border p-3">
          <div className="flex items-center gap-2 flex-1">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-5 w-8" />
        </div>
      ))}
    </div>
  );
}
