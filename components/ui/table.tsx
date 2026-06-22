import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-visible rounded-xl border border-m3-outline-variant/50 bg-m3-surface-container-lowest/80 shadow-m3-soft backdrop-blur-sm md:overflow-auto">
      <table
        className={cn(
          "block w-full caption-bottom text-sm md:table",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("hidden bg-m3-surface-container-high/50 md:table-header-group md:sticky md:top-0 md:z-10 [&_tr]:border-b", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("grid gap-3 p-3 md:table-row-group md:p-0 [&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "block rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-lowest/80 p-3 transition-all duration-200 hover:bg-m3-surface-container-low/60 hover:shadow-m3-soft data-[state=selected]:bg-m3-surface-container md:table-row md:rounded-none md:border-x-0 md:border-t-0 md:bg-transparent md:p-0",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-10 whitespace-nowrap px-4 text-left align-middle text-label-md font-label-md uppercase uppercase-tracking text-m3-on-surface-variant/80",
        className,
      )}
      {...props}
    />
  );
}

type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement> & {
  label?: string;
};

export function TableCell({ className, label, ...props }: TableCellProps) {
  return (
    <td
      data-label={label ?? undefined}
      className={cn(
        "block min-w-0 break-words border-b border-m3-outline-variant/30 py-2.5 align-middle text-body-sm font-body-sm text-m3-on-surface last:border-b-0 md:table-cell md:border-b-0 md:px-4",
        label && "before:mb-1 before:block before:text-label-sm before:font-label-sm before:uppercase before:text-m3-on-surface-variant before:content-[attr(data-label)] md:before:hidden",
        className,
      )}
      {...props}
    />
  );
}
