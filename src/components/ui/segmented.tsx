"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/** A single-select segmented control (range toggles, view switches). */
function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  className?: string;
  "aria-label": string;
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      aria-label={ariaLabel}
      onValueChange={(next) => next && onValueChange(next as T)}
      className={cn("inline-flex items-center rounded-lg bg-muted p-0.5", className)}
    >
      {options.map((option) => (
        <ToggleGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className="h-7 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-card"
        >
          {option.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}

export { Segmented };
