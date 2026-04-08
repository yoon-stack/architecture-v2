import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-900/5 dark:bg-slate-50/5",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
