"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FilterXIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/features/accounts/api";
import { toSearchParams } from "@/lib/api-client";
import { PAGE_SIZES, type SortField } from "@/lib/contracts";
import { formatMoney } from "@/lib/money";
import { useDebouncedValue } from "@/lib/use-debounced-value";

import { useTransactions } from "../api";
import { useTransactionFilters } from "../hooks/use-transaction-filters";
import { ActiveFilterChips, activeFilterCount, FilterPopover } from "./transaction-filters";
import { TransactionDrawer } from "./transaction-drawer";
import { TransactionTable } from "./transaction-table";

function SearchBox({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  const debounced = useDebouncedValue(draft, 300);

  // Adopt external changes to the URL (e.g. "Clear filters") without remounting the input.
  if (value !== synced) {
    setSynced(value);
    if (value !== draft.trim()) setDraft(value);
  }

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // Only push when the debounced draft changes; `value` is read, not tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-sm">
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search counterparty, memo, amount…"
        aria-label="Search transactions"
        className="pl-9 [&::-webkit-search-cancel-button]:hidden"
        maxLength={80}
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            onChange("");
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label="Clear search"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function TransactionsView() {
  const filters = useTransactionFilters();
  const { state, apiQuery, update, clearFilters } = filters;
  const { data, isLoading, isError, isFetching, refetch } = useTransactions(apiQuery);
  const { data: accounts } = useAccounts();

  const sort = {
    sort: (apiQuery.sort ?? "date") as SortField,
    dir: (apiQuery.dir ?? "desc") as "asc" | "desc",
  };
  const onSort = (field: SortField) => {
    const dir =
      sort.sort === field
        ? sort.dir === "asc"
          ? "desc"
          : "asc"
        : field === "counterparty"
          ? "asc"
          : "desc";
    update({
      sort: field === "date" && dir === "desc" ? undefined : field,
      dir: dir === "desc" ? undefined : dir,
    });
  };

  const hasFilters = activeFilterCount(state) > 0 || !!state.q;
  const exportHref = `/api/transactions/export${toSearchParams({ ...apiQuery, page: undefined, pageSize: undefined })}`;
  const first = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        description="Every dollar in and out, across all accounts and cards."
        actions={
          <Button asChild variant="outline">
            <a href={exportHref} download aria-label="Export filtered transactions to CSV">
              <DownloadIcon aria-hidden="true" /> Export CSV
            </a>
          </Button>
        }
      />

      <div className="space-y-3">
        <div className="flex gap-2">
          <SearchBox value={state.q ?? ""} onChange={(q) => update({ q })} />
          <FilterPopover filters={filters} />
        </div>
        <ActiveFilterChips filters={filters} />
      </div>

      <Card className="overflow-hidden">
        <div
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b px-5 py-3 text-sm"
          aria-live="polite"
        >
          <p className="text-muted-foreground">
            {data ? (
              <>
                <span className="tabular font-medium text-foreground">
                  {data.total.toLocaleString("en-US")}
                </span>{" "}
                {data.total === 1 ? "transaction" : "transactions"}
              </>
            ) : (
              "Loading…"
            )}
          </p>
          {data && data.total > 0 && (
            <p className="flex gap-4 text-muted-foreground">
              <span>
                In{" "}
                <span className="tabular font-medium text-positive">
                  {formatMoney(data.summary.inCents)}
                </span>
              </span>
              <span>
                Out{" "}
                <span className="tabular font-medium text-foreground">
                  {formatMoney(data.summary.outCents)}
                </span>
              </span>
            </p>
          )}
        </div>

        <div
          className={
            isFetching && !isLoading ? "opacity-70 transition-opacity" : "transition-opacity"
          }
        >
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : !isLoading && data?.items.length === 0 ? (
            <EmptyState
              icon={hasFilters ? FilterXIcon : undefined}
              title={hasFilters ? "No transactions match these filters" : "No transactions yet"}
              description={
                hasFilters
                  ? "Try widening the date range or removing a filter."
                  : "Payments and deposits will appear here."
              }
              action={
                hasFilters ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      clearFilters();
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <TransactionTable
              items={data?.items ?? []}
              accounts={accounts}
              loading={isLoading}
              sort={sort}
              onSort={onSort}
              onOpen={(txn) => update({ txn }, { resetPage: false })}
              pageSize={Number(apiQuery.pageSize ?? 25)}
            />
          )}
        </div>

        {data && data.total > 0 && (
          <nav
            aria-label="Pagination"
            className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-sm"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="hidden sm:inline">Rows</span>
              <Select
                value={String(data.pageSize)}
                onValueChange={(pageSize) =>
                  update({ pageSize: pageSize === "25" ? undefined : pageSize })
                }
              >
                <SelectTrigger className="h-8 w-[72px]" aria-label="Rows per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="tabular">
                {first}–{last} of {data.total.toLocaleString("en-US")}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={data.page <= 1}
                onClick={() => update({ page: String(data.page - 1) })}
                aria-label="Previous page"
              >
                <ChevronLeftIcon />
              </Button>
              <span className="px-2 tabular text-muted-foreground">
                Page {data.page} of {data.pageCount}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={data.page >= data.pageCount}
                onClick={() => update({ page: String(data.page + 1) })}
                aria-label="Next page"
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </nav>
        )}
      </Card>

      <TransactionDrawer
        id={state.txn ?? null}
        onClose={() => update({ txn: undefined }, { resetPage: false })}
      />
    </div>
  );
}
