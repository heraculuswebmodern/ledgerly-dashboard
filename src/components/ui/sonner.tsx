"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border !bg-popover !text-popover-foreground !shadow-pop !font-sans",
          description: "!text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
