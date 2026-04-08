import React, { useState } from "react";
import TextareaAutosize, {
  type TextareaAutosizeProps,
} from "react-textarea-autosize";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

import { mergeRefs } from "react-merge-refs";
import { useResizeObserverWidth } from "@/hooks/use-resize-observer";

const textAreaVariants = cva(
  "resize-none outline-none text-inherit inline-block w-full placeholder:text-placeholder placeholder:font-light focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-border bg-transparent focus-visible:ring-1 focus-visible:ring-ring data-[error=true]:border-destructive data-[error=true]:ring-error-border",
        ghost:
          "hover:ring-1 focus-visible:ring-1 hover:ring-border focus-visible:ring-primary hover:bg-transparent",
        invisible: "bg-transparent",
      },
      size: {
        default: "px-3 py-1 min-h-9 rounded-md text-base",
        sm: "px-2 py-1 min-h-8 rounded-sm text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type BaseTextAreaProps = React.ComponentProps<"textarea"> &
  VariantProps<typeof textAreaVariants> & {
    placeholder?: string;
  };

export const BaseTextArea = React.forwardRef<
  HTMLTextAreaElement,
  BaseTextAreaProps
>(({ className, variant, size, ...props }, forwardRef) => {
  return (
    <textarea
      className={cn(textAreaVariants({ variant, size, className }))}
      ref={forwardRef}
      {...props}
    />
  );
});

export const UncontrolledBaseTextArea = ({
  value,
  onBlur,
  ...props
}: BaseTextAreaProps) => {
  const [editedValue, setEditedValue] = useState<string | null>(null);

  return (
    <BaseTextArea
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
        if (event.key === "Enter" && !event.shiftKey) {
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          setEditedValue(null);
          event.currentTarget.blur();
        }
      }}
      {...props}
    />
  );
};

type TextAreaProps = TextareaAutosizeProps &
  VariantProps<typeof textAreaVariants> & {
    placeholder?: string;
  };

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, variant, size, ...props }, forwardRef) => {
    // force re-render if the width of the text area changes to update its height
    const { ref } = useResizeObserverWidth<HTMLTextAreaElement>();

    return (
      <TextareaAutosize
        className={cn(textAreaVariants({ variant, size, className }))}
        {...props}
        ref={mergeRefs([ref, forwardRef])}
      />
    );
  },
);

TextArea.displayName = "TextArea";

type UncontrolledTextAreaProps = TextAreaProps & {
  singleLine?: boolean;
};

export const UncontrolledTextArea = ({
  value,
  onBlur,
  singleLine,
  ...props
}: UncontrolledTextAreaProps) => {
  const [editedValue, setEditedValue] = useState<string | null>(null);

  return (
    <TextArea
      value={editedValue ?? value}
      onChange={(event) => {
        const value = event.target.value;
        if (typeof value === "string") {
          setEditedValue(singleLine ? value.replace(/\n/g, "") : value);
        }
      }}
      onBlur={(event) => {
        onBlur?.(event);
        setEditedValue(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          setEditedValue(null);
          event.currentTarget.blur();
        }
      }}
      {...props}
    />
  );
};
