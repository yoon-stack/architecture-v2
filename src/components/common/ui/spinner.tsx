import { cn } from "@/lib/utils";
import { CircleIcon, Loader2Icon } from "lucide-react";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

function Pulser({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CircleIcon>) {
  return (
    <CircleIcon
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-pulse-scale size-3 fill-current stroke-0",
        className,
      )}
      {...props}
    />
  );
}

export { Spinner, Pulser };
