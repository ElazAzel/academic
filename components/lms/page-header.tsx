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
        <span className="mb-3 block h-1 w-12 rounded-full bg-[var(--academy-accent)]" aria-hidden="true" />
        <h1 className="text-headline-lg font-semibold text-m3-on-surface">{title}</h1>
        <p className="mt-2 max-w-3xl text-body-md text-m3-on-surface-variant">{description}</p>
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
