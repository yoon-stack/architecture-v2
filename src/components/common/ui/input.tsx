import * as React from "react";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const inputVariants = cva(
  "flex w-full transition-colors text-foreground placeholder:text-placeholder placeholder:font-light file:border-0 file:bg-transparent file:text-base file:font-medium file:text-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-border bg-transparent focus-visible:ring-1 focus-visible:ring-ring data-[error=true]:border-destructive data-[error=true]:ring-red-200",
        primary:
          "border border-border bg-transparent focus-visible:ring-1 focus-visible:ring-primary data-[error=true]:border-destructive data-[error=true]:ring-red-200",
        ghost:
          "hover:ring-1 focus-visible:ring-1 hover:ring-border focus-visible:ring-primary hover:bg-transparent",
        muted:
          "border border-transparent bg-muted focus-visible:ring-1 focus-visible:ring-primary data-[error=true]:border-destructive data-[error=true]:ring-red-200",
      },
      size: {
        lg: "px-3 py-1.5 h-11 rounded-md text-lg",
        default: "px-3 py-1 h-9 rounded-md text-base",
        sm: "px-2 py-1 h-8 rounded-sm text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, size, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

const UncontrolledInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ value, onBlur, ...props }, ref) => {
    const [editedValue, setEditedValue] = React.useState<string | null>(null);

    return (
      <Input
        value={editedValue ?? value}
        onChange={(event) => {
          const value = event.target.value;
          if (typeof value === "string") {
            setEditedValue(value);
          }
        }}
        onBlur={(event) => {
          onBlur?.(event);
          setEditedValue(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            setEditedValue(null);
            event.currentTarget.blur();
          }
        }}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input, UncontrolledInput };
