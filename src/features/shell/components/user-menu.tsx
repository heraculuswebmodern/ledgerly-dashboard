"use client";

import { ChevronsUpDownIcon, LogOutIcon, SettingsIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

import { useLogout, useSession } from "../api";

export function UserMenu() {
  const { data: user } = useSession();
  const logout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2.5 rounded-lg p-1 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring sm:pr-2"
        aria-label="Account menu"
      >
        {user ? (
          <Avatar name={user.name} size="sm" />
        ) : (
          <Skeleton className="size-7 rounded-full" />
        )}
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-[13px] leading-tight font-medium">
            {user?.name ?? " "}
          </span>
          <span className="block truncate text-[11px] leading-tight text-muted-foreground">
            {user?.company ?? " "}
          </span>
        </span>
        <ChevronsUpDownIcon
          className="hidden size-3.5 text-muted-foreground sm:block"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium text-foreground">{user?.name}</p>
          <p className="truncate text-xs">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon aria-hidden="true" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings#security">
            <ShieldCheckIcon aria-hidden="true" /> Security
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOutIcon aria-hidden="true" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
