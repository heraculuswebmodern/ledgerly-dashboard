"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { formatMoney, parseMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Dollar amount input. Keeps the raw text while typing and tidies it on blur. */
export function MoneyInput({
  className,
  onBlur,
  onChange,
  value,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"input">, "size" | "value"> & {
  value: string;
  size?: "default" | "lg";
}) {
  return (
    <div className="relative">
      <span
        className={cn(
          "pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground",
          size === "lg" && "left-4 text-2xl font-medium",
        )}
        aria-hidden="true"
      >
        $
      </span>
      <Input
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={onChange}
        onBlur={(e) => {
          const cents = parseMoney(e.target.value);
          if (cents !== null && cents >= 0) {
            const tidy = formatMoney(cents, { sign: "never" }).slice(1);
            if (tidy !== e.target.value) {
              e.target.value = tidy;
              onChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>);
            }
          }
          onBlur?.(e);
        }}
        className={cn(
          "pl-7 tabular",
          size === "lg" && "h-14 pl-9 text-2xl font-semibold tracking-tight",
          className,
        )}
        {...props}
      />
    </div>
  );
}
