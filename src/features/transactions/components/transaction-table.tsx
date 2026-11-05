"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, CreditCardIcon } from "lucide-react";

import { Amount } from "@/components/shared/amount";
import { CategoryIcon } from "@/components/shared/category-icon";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CATEGORY_LABELS,
  METHOD_LABELS,
  type Account,
  type SortField,
  type Transaction,
} from "@/lib/contracts";
import { formatDate, formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type SortState = { sort: SortField; dir: "asc" | "desc" };

function SortHeader({
  field,
  label,
  sort,
  onSort,
  align = "left",
}: {
  field: SortField;
  label: string;
  sort: SortState;
  onSort: (field: SortField) => void;
  align?: "left" | "right";
}) {
  const active = sort.sort === field;
  const Icon = !active ? ArrowUpDownIcon : sort.dir === "asc" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <TableHead
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn(align === "right" && "text-right")}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden="true" />
      </button>
    </TableHead>
  );
}

function MethodLabel({ t }: { t: Transaction }) {
  if (t.method === "card" && t.cardLast4) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <CreditCardIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="tabular">••{t.cardLast4}</span>
      </span>
    );
  }
  return <span>{METHOD_LABELS[t.method]}</span>;
}

export function TransactionTable({
  items,
  accounts,
  loading,
  sort,
  onSort,
  onOpen,
  pageSize,
}: {
  items: Transaction[];
  accounts: Account[] | undefined;
  loading: boolean;
  sort: SortState;
  onSort: (field: SortField) => void;
  onOpen: (id: string) => void;
  pageSize: number;
}) {
  const accountName = (id: string) => accounts?.find((a) => a.id === id)?.name ?? "—";

  if (loading) return <TableSkeleton rows={Math.min(pageSize, 10)} />;

  return (
    <>
      {/* Desktop / tablet: a real table with sortable headers. */}
      <div className="hidden md:block">
        <Table>
          <caption className="sr-only">Transactions. Select a row to see details.</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortHeader field="date" label="Date" sort={sort} onSort={onSort} />
              <SortHeader field="counterparty" label="Counterparty" sort={sort} onSort={onSort} />
              <TableHead>Category</TableHead>
              <TableHead className="hidden lg:table-cell">Method</TableHead>
              <TableHead className="hidden xl:table-cell">Account</TableHead>
              <TableHead>Status</TableHead>
              <SortHeader field="amount" label="Amount" sort={sort} onSort={onSort} align="right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((t) => (
              <TableRow
                key={t.id}
                onClick={() => onOpen(t.id)}
                className="cursor-pointer hover:bg-accent/60"
              >
                <TableCell className="tabular text-muted-foreground">
                  {formatShortDate(t.date)}
                </TableCell>
                <TableCell className="max-w-[18rem]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(t.id);
                    }}
                    className="flex w-full min-w-0 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`${t.counterparty}, ${formatDate(t.date)}. View details`}
                  >
                    <Avatar name={t.counterparty} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{t.counterparty}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.description}
                      </span>
                    </span>
                  </button>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <CategoryIcon category={t.category} className="size-3.5" />
                    <span className="text-foreground">{CATEGORY_LABELS[t.category]}</span>
                  </span>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <MethodLabel t={t} />
                </TableCell>
                <TableCell className="hidden text-muted-foreground xl:table-cell">
                  {accountName(t.accountId)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium",
                    t.status === "failed" && "line-through decoration-muted-foreground/60",
                  )}
                >
                  <Amount cents={t.amountCents} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked list. */}
      <ul className="divide-y md:hidden">
        {items.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onOpen(t.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none hover:bg-accent/60 focus-visible:bg-accent"
            >
              <Avatar name={t.counterparty} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{t.counterparty}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {formatShortDate(t.date)} · {CATEGORY_LABELS[t.category]}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <Amount cents={t.amountCents} className="text-sm font-medium" />
                {t.status !== "posted" && <StatusBadge status={t.status} />}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="divide-y" aria-busy="true" aria-label="Loading transactions">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          <Skeleton className="hidden h-4 w-14 md:block" />
          <Skeleton className="size-7 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-5 w-20 rounded-full md:block" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
