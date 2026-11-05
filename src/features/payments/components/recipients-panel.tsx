"use client";

import { EllipsisIcon, PencilIcon, PlusIcon, SendIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { useState } from "react";

import { EmptyState, ErrorState } from "@/components/shared/states";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { Recipient } from "@/lib/contracts";
import { formatDate } from "@/lib/dates";

import { useDeleteRecipient, useRecipients } from "../api";
import { RecipientDialog } from "./recipient-dialog";

export function RecipientsPanel({
  addOpen,
  onAddOpenChange,
  onPay,
}: {
  addOpen: boolean;
  onAddOpenChange: (open: boolean) => void;
  onPay: (recipientId: string) => void;
}) {
  const { data, isLoading, isError, refetch } = useRecipients();
  const remove = useDeleteRecipient();
  const [editing, setEditing] = useState<Recipient | null>(null);
  const [deleting, setDeleting] = useState<Recipient | null>(null);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Recipients</h2>
          <p className="text-[13px] text-muted-foreground">
            Vendors, contractors and partners you pay.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onAddOpenChange(true)}>
          <PlusIcon aria-hidden="true" /> Add recipient
        </Button>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="divide-y">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : data?.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No recipients yet"
          description="Add a vendor or contractor to start paying them."
          action={
            <Button size="sm" onClick={() => onAddOpenChange(true)}>
              <PlusIcon aria-hidden="true" /> Add recipient
            </Button>
          }
        />
      ) : (
        <ul className="divide-y">
          {data?.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={r.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.bankName} <span className="tabular">••{r.accountLast4}</span>
                  {r.lastPaidAt ? ` · Last paid ${formatDate(r.lastPaidAt)}` : " · Never paid"}
                </p>
              </div>
              <Badge variant="outline" className="hidden sm:inline-flex">
                {r.defaultRail.toUpperCase()}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => onPay(r.id)}
              >
                <SendIcon aria-hidden="true" /> Pay
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${r.name}`}>
                    <EllipsisIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onPay(r.id)}>
                    <SendIcon aria-hidden="true" /> Pay
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setEditing(r)}>
                    <PencilIcon aria-hidden="true" /> Edit details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(r)}>
                    <Trash2Icon aria-hidden="true" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <RecipientDialog open={addOpen} recipient={null} onClose={() => onAddOpenChange(false)} />
      <RecipientDialog open={!!editing} recipient={editing} onClose={() => setEditing(null)} />

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name}?</DialogTitle>
            <DialogDescription>
              Their bank details will be removed and any scheduled payments to them will be
              cancelled. Past transactions stay in your ledger.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Keep recipient
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleting) remove.mutate(deleting);
                setDeleting(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
