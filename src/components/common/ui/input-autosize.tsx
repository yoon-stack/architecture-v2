import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import React, {
  type ForwardedRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";

const FONT_PROPERTIES =
  "text-inherit font-inherit leading-inherit tracking-inherit";

const SIZE_PROPERTIES = "m-px max-w-full min-w-6 ";

const inputVariants = cva(
  "absolute top-0 left-0 bottom-0 right-0 outline-none inline-block placeholder:text-placeholder placeholder:font-light focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-md bg-transparent hover:ring-1 hover:ring-border focus-visible:ring-1 focus-visible:ring-primary",
        ghost: "bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type AutosizeInputProps = React.HTMLAttributes<HTMLInputElement> & {
  containerClassName?: string;
  placeholder?: string;
  value: string;
} & VariantProps<typeof inputVariants>;

export const AutosizeInput = forwardRef<HTMLInputElement, AutosizeInputProps>(
  (
    {
      value,
      placeholder = "Name...",
      className,
      containerClassName,
      variant,
      ...props
    },
    ref: ForwardedRef<HTMLInputElement>,
  ) => {
    return (
      <div
        className={cn(
          FONT_PROPERTIES,
          "relative flex h-auto max-h-full w-fit min-w-px flex-[0_1_auto] items-center overflow-hidden p-0",
          containerClassName,
        )}
      >
        <input
          ref={ref}
          value={value}
          placeholder={placeholder}
          className={cn(
            FONT_PROPERTIES,
            SIZE_PROPERTIES,
            inputVariants({ variant }),
            className,
          )}
          {...props}
        />
        <span
          aria-hidden={true}
          className={cn(
            FONT_PROPERTIES,
            SIZE_PROPERTIES,
            className,
            "pointer-events-none invisible whitespace-pre",
          )}
        >
          {value || placeholder}
          {`\n`}
        </span>
      </div>
    );
  },
);

export const UncontrolledAutosizeInput = ({
  value,
  onBlur,
  onChange,
  ...props
}: AutosizeInputProps) => {
  const [editedValue, setEditedValue] = useState<string | null>(null);

  return (
    <AutosizeInput
      value={editedValue ?? value}
      onChange={(event) => {
        const value = event.currentTarget.value;
        if (typeof value === "string") {
          setEditedValue(value);
        }
        onChange?.(event);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        setEditedValue(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          event.currentTarget.value = value;
          setEditedValue(null);
          event.currentTarget.blur();
        }
      }}
      {...props}
    />
  );
};

export type InlineEditingTextImperativeHandle = {
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
};

type InlineEditableTextProps = Omit<
  React.HTMLAttributes<HTMLElement>,
  "onChange" | "value"
> & {
  value: string;
  onChange?: (name: string) => void;
  style?: React.CSSProperties;
  className?: string;
};

export const InlineEditableText = forwardRef<
  InlineEditingTextImperativeHandle,
  InlineEditableTextProps
>(({ value, onChange, className, style, ...props }, ref) => {
  const [editing, setEditing] = useState(false);

  useImperativeHandle(ref, () => {
    return { setEditing };
  });

  if (editing && onChange != null) {
    return (
      <UncontrolledAutosizeInput
        value={value}
        onBlur={(event) => {
          onChange(event.currentTarget.value);
          setEditing(false);
        }}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        className={className}
        style={style}
        {...props}
      />
    );
  }

  return (
    <span
      onDoubleClick={
        onChange == null
          ? undefined
          : (event) => {
              setEditing(true);
              event.stopPropagation();
            }
      }
      style={style}
      className={cn(
        SIZE_PROPERTIES,
        "block overflow-hidden text-ellipsis whitespace-pre",
        className,
      )}
      {...props}
    >
      {value || "\u00A0"}
    </span>
  );
});
