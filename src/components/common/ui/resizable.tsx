import { cn } from "@/lib/utils";

import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type ForwardedRef,
  type RefObject,
} from "react";

import { useEvent } from "react-use";

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Walk up from el to find the nearest ancestor with display:flex/inline-flex */
function findFlexParent(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;
  while (parent) {
    const display = window.getComputedStyle(parent).display;
    if (display === "flex" || display === "inline-flex") return parent;
    parent = parent.parentElement;
  }
  return null;
}

/** Collect visual flex children, flattening display:contents nodes */
function collectFlexChildren(parent: HTMLElement): HTMLElement[] {
  const result: HTMLElement[] = [];
  for (const child of Array.from(parent.children)) {
    const display = window.getComputedStyle(child as HTMLElement).display;
    if (display === "contents") {
      result.push(...collectFlexChildren(child as HTMLElement));
    } else {
      result.push(child as HTMLElement);
    }
  }
  return result;
}

type UseResizeElementProps = {
  onResize: (width: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: (width: number) => void;
  onReset?: () => void;
  minSize?: number;
  maxSize?: number;
  invertX?: boolean;
};

type UseResizeElementReturn<T extends HTMLElement> = {
  ref: RefObject<T | null>;
  handle: (el: T | null) => void;
  resizing: boolean;
};

const useResizeElement = <T extends HTMLElement>({
  onResize,
  onResizeStart,
  onResizeEnd,
  onReset,
  minSize = -Infinity,
  maxSize = Infinity,
  invertX = false,
}: UseResizeElementProps): UseResizeElementReturn<T> => {
  const initial = useRef<{
    position: [number, number];
    width: number;
    maxAvailable: number;
  } | null>(null);
  const ref = useRef<T | null>(null);
  const [handle, setHandle] = useState<T | null>(null);
  const [resizing, setResizing] = useState<boolean>(false);

  const startResizing = useCallback(
    (event: Event) => {
      if (event instanceof MouseEvent && event.button === 0 && ref.current) {
        event.stopPropagation();
        event.preventDefault();

        const bbox = ref.current.getBoundingClientRect();

        // Measure parent flex container and fixed-width siblings to compute max available width
        let maxAvailable = Infinity;
        const flexParent = findFlexParent(ref.current);
        if (flexParent) {
          const parentWidth = flexParent.getBoundingClientRect().width;
          const flexChildren = collectFlexChildren(flexParent);
          let fixedSiblingsWidth = 0;
          for (const child of flexChildren) {
            // Skip this element and any ancestor/descendant of it
            if (child === ref.current || child.contains(ref.current)) continue;
            const style = window.getComputedStyle(child);
            if (
              style.position === "fixed" ||
              style.position === "absolute" ||
              style.display === "none"
            )
              continue;
            if (!(parseFloat(style.flexGrow) > 0)) {
              fixedSiblingsWidth += child.getBoundingClientRect().width;
            }
          }
          maxAvailable = parentWidth - fixedSiblingsWidth;
        }

        initial.current = {
          position: [event.clientX, event.clientY],
          width: bbox.width,
          maxAvailable,
        };
        setResizing(true);
        onResizeStart?.();
      }
    },
    [onResizeStart],
  );

  const calculateSize = useCallback(
    (event: React.MouseEvent) => {
      if (!initial.current) return 0;

      const { position, width, maxAvailable } = initial.current;
      const x = Math.min(event.clientX, window.innerWidth - 12);
      const deltaX = (x - position[0]) * (invertX ? -1 : 1);

      const newWidth = deltaX + width;
      const effectiveMax = Math.min(maxSize, maxAvailable);

      return clamp(newWidth, minSize, effectiveMax);
    },
    [invertX, minSize, maxSize],
  );

  const stopResizing = useCallback(
    (event: React.MouseEvent) => {
      if (!initial.current) return;
      event.stopPropagation();
      onResizeEnd?.(calculateSize(event));
      initial.current = null;
      setResizing(false);
    },
    [onResizeEnd, calculateSize],
  );

  const resize = useCallback(
    (event: React.MouseEvent) => {
      if (!initial.current) return;
      onResize(calculateSize(event));
    },
    [calculateSize, onResize],
  );

  useEvent("mousemove", resize);
  useEvent("mouseup", stopResizing);
  useEvent("mousedown", startResizing, handle);
  useEvent("dblclick", onReset, handle);

  return { handle: setHandle, ref, resizing };
};

type Direction = "left" | "right";

type ResizableProps = React.HTMLAttributes<HTMLDivElement> &
  Omit<UseResizeElementProps, "invertX"> & {
    direction?: Direction;
    width: number;
  };

export const Resizable = ({
  width,
  className,
  style = {},
  children,
  direction = "right",
  maxSize,
  minSize,
  onResizeEnd,
  onResizeStart,
  onResize,
  onReset,
  ...props
}: ResizableProps) => {
  const { handle, ref, resizing } = useResizeElement<HTMLDivElement>({
    onResize,
    invertX: direction === "left",
    onReset,
    maxSize,
    minSize,
    onResizeEnd,
    onResizeStart,
  });

  return (
    <div
      style={{ width, ...style }}
      data-resizing={resizing}
      className={cn(
        "relative transition-all data-[resizing='true']:transition-none",
        className,
      )}
      {...props}
      ref={ref}
    >
      {children}
      <ResizableHandle
        ref={handle}
        data-resizing={resizing}
        direction={direction}
      />
    </div>
  );
};

type ResizableHandleProps = React.HTMLAttributes<HTMLDivElement> & {
  direction?: Direction;
};

const ResizableHandle = forwardRef(
  (
    { className, direction = "right", ...props }: ResizableHandleProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) => (
    <div
      className={cn(
        "group data-[resizing='true']:bg-primary data-[resizing='true']:ring-primary/5 hover:bg-border-dark absolute top-0 z-50 flex h-full w-px cursor-ew-resize justify-center before:absolute before:-inset-2 hover:ring-2 hover:ring-slate-900/2 focus-visible:outline-none data-[resizing='true']:ring-2",
        className,
      )}
      style={{ [direction]: 0 }}
      {...props}
      ref={ref}
    />
  ),
);
