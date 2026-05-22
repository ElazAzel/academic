import { getUserXp } from "@/server/actions/xp";
import { getLevel } from "@/lib/xp-utils";
import { XpDisplayClient } from "./xp-display-client";

export async function XpDisplay({ userId }: { userId: string }) {
  const xp = await getUserXp(userId);
  const levelInfo = getLevel(xp);

  return <XpDisplayClient xp={xp} levelInfo={levelInfo} />;
}
