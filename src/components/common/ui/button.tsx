import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* eslint-disable-next-line react-refresh/only-export-components  */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-foreground focus-visible:ring-foreground/50 focus-visible:ring-[1px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        solid: "bg-primary text-white hover:bg-primary/85",
        success: "bg-success text-white hover:bg-success-foreground",
        default: "bg-invert-bg text-invert-fg hover:bg-invert-bg/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-surface-hover hover:text-foreground",
        secondary: "bg-secondary text-primary hover:bg-secondary/80",
        secondaryBorder:
          "bg-secondary text-primary hover:bg-secondary/80 border border-primary",
        light: "bg-background text-foreground hover:bg-accent border",
        tertiary: "bg-tertiary text-foreground hover:bg-accent border",
        ghost: "text-foreground hover:bg-accent hover:text-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
        dashed:
          "border bg-transparent border-dashed border-border text-foreground/60 hover:bg-surface-hover hover:text-foreground",
        trigger:
          "aria-expanded:ring-primary hover:ring-border hover:bg-accent/30 hover:ring-1 aria-expanded:ring-1",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-7.5 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-7.5",
        "icon-lg": "size-10",
        "icon-xs": "size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
