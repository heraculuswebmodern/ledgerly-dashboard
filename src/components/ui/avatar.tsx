import { cn } from "@/lib/utils";

/** Initials avatar with a deterministic tint, so every counterparty gets a stable color. */
const TINTS = [
  "bg-[#e3f4ee] text-[#065f46] dark:bg-[#10b981]/15 dark:text-[#6ee7b7]",
  "bg-[#e6eefb] text-[#1e3a8a] dark:bg-[#3b82f6]/15 dark:text-[#93c5fd]",
  "bg-[#fdeee6] text-[#9a3412] dark:bg-[#f97316]/15 dark:text-[#fdba74]",
  "bg-[#efeafd] text-[#4c1d95] dark:bg-[#8b5cf6]/15 dark:text-[#c4b5fd]",
  "bg-[#fdf3d8] text-[#78350f] dark:bg-[#f59e0b]/15 dark:text-[#fcd34d]",
  "bg-[#e5f5f5] text-[#115e59] dark:bg-[#14b8a6]/15 dark:text-[#5eead4]",
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  const parts = name
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function Avatar({
  name,
  className,
  size = "md",
}: {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight",
        size === "sm" && "size-7 text-[10px]",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-12 text-sm",
        TINTS[hash(name) % TINTS.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export { Avatar };
