import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

const Tabs = TabsPrimitive.Root;

const tabListVariants = cva("inline-flex", {
  variants: {
    variant: {
      default:
        "relative bg-tertiary dark:bg-secondary-100 border border-border h-10 rounded-lg p-1 text-muted-foreground items-center justify-center [&_button[role=tab]]:rounded-md [&_button[role=tab]:focus-visible]:ring-2 [&_button[role=tab]:focus-visible]:ring-ring [&_button[role=tab]:focus-visible]:ring-offset-2 [&_button[role=tab]:focus-visible]:outline-none [&_button[role=tab][data-state=active]]:text-foreground",
      underlined:
        "relative h-full px-1 py-0 text-foreground items-center justify-center [&_button[role=tab]]:h-full [&_button[role=tab]:focus-visible]:ring-2 [&_button[role=tab]:focus-visible]:ring-ring [&_button[role=tab]:focus-visible]:outline-none [&_button[role=tab]:hover]:border-border [&_button[role=tab]:hover]:text-foreground [&_button[role=tab]]:border-transparent [&_button[role=tab][data-state=active]]:border-primary [&_button[role=tab][data-state=active]]:text-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const TabsList = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) => {
  const [state, setState] = React.useState<null | {
    width: number;
    left: number;
  }>(null);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const attributeName = "data-state";
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === attributeName
        ) {
          if (
            mutation.target instanceof HTMLElement &&
            mutation.target.getAttribute(attributeName) === "active"
          ) {
            setState({
              width: mutation.target.offsetWidth,
              left: mutation.target.offsetLeft,
            });
          }
        }
      }
    });

    if (ref.current) {
      const active = ref.current?.querySelector('button[data-state="active"]');
      if (active && active instanceof HTMLElement) {
        setState({ width: active.offsetWidth, left: active.offsetLeft });
      }

      observer.observe(ref.current, {
        attributes: true,
        subtree: true,
        attributeFilter: [attributeName],
      });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <TabsPrimitive.List
      className={cn(tabListVariants({ className }))}
      ref={ref}
      {...props}
    >
      {state && (
        <div
          className="absolute top-1 bottom-1 left-0 translate-0 rounded-md bg-background shadow transition-[transform,width] duration-300 ease-in-out"
          style={{
            transform: `translateX(${state.left}px)`,
            width: state.width,
          }}
        />
      )}
      {children}
    </TabsPrimitive.List>
  );
};

export const TabsListUnderlined = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) => {
  const [state, setState] = React.useState<null | {
    width: number;
    left: number;
  }>(null);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const attributeName = "data-state";
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === attributeName
        ) {
          if (
            mutation.target instanceof HTMLElement &&
            mutation.target.getAttribute(attributeName) === "active"
          ) {
            setState({
              width: mutation.target.offsetWidth,
              left: mutation.target.offsetLeft,
            });
          }
        }
      }
    });

    if (ref.current) {
      const active = ref.current?.querySelector('button[data-state="active"]');
      if (active && active instanceof HTMLElement) {
        setState({ width: active.offsetWidth, left: active.offsetLeft });
      }

      observer.observe(ref.current, {
        attributes: true,
        subtree: true,
        attributeFilter: [attributeName],
      });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <TabsPrimitive.List
      className={cn(tabListVariants({ variant: "underlined", className }))}
      ref={ref}
      {...props}
    >
      {children}
      {state && (
        <div
          className="bg-primary absolute bottom-0 left-0 h-[2px] translate-0 transition-transform"
          style={{
            transform: `translateX(${state.left}px)`,
            width: state.width,
          }}
        />
      )}
    </TabsPrimitive.List>
  );
};

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative inline-flex items-center justify-center px-3 py-1 text-base font-medium whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-2 focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
