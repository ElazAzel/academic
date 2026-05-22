import { getUserXp, getLevel } from "@/server/actions/xp";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export async function XpDisplay({ userId }: { userId: string }) {
  const xp = await getUserXp(userId);
  const levelInfo = getLevel(xp);

  return (
    <Card className="overflow-hidden border-m3-outline-variant bg-gradient-to-r from-m3-primary-fixed/10 to-m3-tertiary-fixed/10 shadow-m3-soft">
      <CardContent className="flex items-center gap-4 p-4">
        {/* Level badge */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-m3-primary-fixed text-label-lg font-label-lg text-m3-primary">
          {levelInfo.level}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-label-md font-label-md text-m3-on-surface">
              Уровень {levelInfo.level}: {levelInfo.name}
            </span>
            <span className="text-label-sm font-label-sm text-m3-primary font-semibold">
              {xp} XP
            </span>
          </div>
          <Progress value={levelInfo.progress} className="h-1.5" />
          <p className="text-[11px] text-m3-on-surface-variant/70">
            {levelInfo.progress < 100
              ? `${levelInfo.progress}% до следующего уровня`
              : "Максимальный уровень достигнут!"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
