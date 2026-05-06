import { Badge } from "@/components/ui/badge";

export function PageHeader({
  title,
  description,
  badge
}: {
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {badge ? <Badge className="mb-3 border-primary/20 bg-primary/5 text-primary">{badge}</Badge> : null}
        <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

