export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="academy-page-header mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-headline-lg font-headline-lg tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-body-md font-body-md text-muted-foreground leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
