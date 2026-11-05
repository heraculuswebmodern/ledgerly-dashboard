"use client";

import { BellIcon, CreditCardIcon, InfoIcon, SendIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type { Notification } from "@/lib/contracts";
import { formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { useMarkNotificationsRead, useNotifications } from "../api";

const ICONS: Record<Notification["kind"], typeof BellIcon> = {
  payment: SendIcon,
  card: CreditCardIcon,
  security: ShieldCheckIcon,
  info: InfoIcon,
};

export function NotificationsMenu() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const unread = data?.filter((n) => !n.read).length ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <BellIcon aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-emerald tabular text-[10px] font-semibold text-ink ring-2 ring-background">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button
            variant="link"
            size="sm"
            className="text-xs text-muted-foreground"
            disabled={!unread || markRead.isPending}
            onClick={() => markRead.mutate()}
          >
            Mark all as read
          </Button>
        </div>
        <ul className="max-h-[22rem] overflow-y-auto py-1" aria-live="polite">
          {isLoading &&
            Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="flex gap-3 px-4 py-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </li>
            ))}
          {data?.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </li>
          )}
          {data?.map((n) => {
            const Icon = ICONS[n.kind];
            const body = (
              <div className="flex gap-3 px-4 py-3 transition-colors hover:bg-accent">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatRelative(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald"
                    aria-label="Unread"
                  />
                )}
              </div>
            );
            return (
              <li key={n.id}>
                {n.href ? (
                  <PopoverClose asChild>
                    <Link href={n.href} className="block outline-none focus-visible:bg-accent">
                      {body}
                    </Link>
                  </PopoverClose>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
