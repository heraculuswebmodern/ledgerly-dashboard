"use client";

import { SlidersHorizontalIcon, XIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Segmented } from "@/components/ui/segmented";
import { Separator } from "@/components/ui/separator";
import { useAccounts } from "@/features/accounts/api";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  METHOD_LABELS,
  PAYMENT_METHODS,
  STATUS_LABELS,
  TRANSACTION_STATUSES,
} from "@/lib/contracts";
import { daysAgoIso, formatShortDate, todayIso } from "@/lib/dates";

import type { TransactionFiltersApi } from "../hooks/use-transaction-filters";

function CheckGroup({
  legend,
  options,
  selected,
  onChange,
  columns = 2,
}: {
  legend: string;
  options: readonly { value: string; label: ReactNode }[];
  selected: string[];
  onChange: (next: string[]) => void;
  columns?: number;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-muted-foreground">{legend}</legend>
      <div
        className="grid gap-x-3 gap-y-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const id = `${legend}-${o.value}`;
          const checked = selected.includes(o.value);
          return (
            <div key={o.value} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(v) =>
                  onChange(v ? [...selected, o.value] : selected.filter((s) => s !== o.value))
                }
              />
              <Label htmlFor={id} className="truncate font-normal">
                {o.label}
              </Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
] as const;

export function FilterPopover({ filters }: { filters: TransactionFiltersApi }) {
  const { state, selected, update, clearFilters } = filters;
  const { data: accounts } = useAccounts();
  const [min, setMin] = useState(state.min ?? "");
  const [max, setMax] = useState(state.max ?? "");
  const active = activeFilterCount(state);

  const setList = (key: "category" | "status" | "method" | "account") => (next: string[]) =>
    update({ [key]: next.join(",") || undefined });

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) {
          setMin(state.min ?? "");
          setMax(state.max ?? "");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label={active ? `Filters, ${active} active` : "Filters"}>
          <SlidersHorizontalIcon aria-hidden="true" />
          Filters
          {active > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary tabular text-[11px] font-semibold text-primary-foreground">
              {active}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-h-[min(80dvh,640px)] w-[min(30rem,calc(100vw-2rem))] overflow-y-auto p-0">
        <div className="space-y-5 p-4">
          <fieldset>
            <legend className="mb-2 text-xs font-medium text-muted-foreground">Date range</legend>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <Button
                  key={p.days}
                  size="sm"
                  variant="secondary"
                  onClick={() => update({ from: daysAgoIso(p.days - 1), to: todayIso() })}
                >
                  {p.label}
                </Button>
              ))}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => update({ from: `${todayIso().slice(0, 4)}-01-01`, to: todayIso() })}
              >
                Year to date
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="filter-from" className="text-xs font-normal text-muted-foreground">
                  From
                </Label>
                <Input
                  id="filter-from"
                  type="date"
                  value={state.from ?? ""}
                  max={state.to}
                  onChange={(e) => update({ from: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="filter-to" className="text-xs font-normal text-muted-foreground">
                  To
                </Label>
                <Input
                  id="filter-to"
                  type="date"
                  value={state.to ?? ""}
                  min={state.from}
                  onChange={(e) => update({ to: e.target.value })}
                />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-medium text-muted-foreground">Direction</legend>
            <Segmented
              aria-label="Direction"
              value={(state.direction as "all" | "in" | "out") ?? "all"}
              onValueChange={(v) => update({ direction: v === "all" ? undefined : v })}
              options={[
                { value: "all", label: "All" },
                { value: "in", label: "Money in" },
                { value: "out", label: "Money out" },
              ]}
            />
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-medium text-muted-foreground">
              Amount (absolute, USD)
            </legend>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                update({ min: min.trim() || undefined, max: max.trim() || undefined });
              }}
            >
              <Input
                aria-label="Minimum amount"
                inputMode="decimal"
                placeholder="Min"
                value={min}
                onChange={(e) => setMin(e.target.value)}
              />
              <span className="pb-2 text-muted-foreground" aria-hidden="true">
                –
              </span>
              <Input
                aria-label="Maximum amount"
                inputMode="decimal"
                placeholder="Max"
                value={max}
                onChange={(e) => setMax(e.target.value)}
              />
              <Button type="submit" variant="secondary">
                Apply
              </Button>
            </form>
          </fieldset>

          <Separator />
          <CheckGroup
            legend="Status"
            columns={3}
            options={TRANSACTION_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            selected={selected.status}
            onChange={setList("status")}
          />
          <CheckGroup
            legend="Type"
            columns={4}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: METHOD_LABELS[m] }))}
            selected={selected.method}
            onChange={setList("method")}
          />
          {accounts && (
            <CheckGroup
              legend="Account"
              columns={3}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              selected={selected.account}
              onChange={setList("account")}
            />
          )}
          <CheckGroup
            legend="Category"
            options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
            selected={selected.category}
            onChange={setList("category")}
          />
        </div>
        <div className="sticky bottom-0 flex justify-between border-t bg-popover px-4 py-3">
          <Button variant="ghost" size="sm" onClick={clearFilters} disabled={active === 0}>
            Clear all
          </Button>
          <p className="self-center text-xs text-muted-foreground">Filters apply instantly</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function activeFilterCount(state: TransactionFiltersApi["state"]) {
  let n = 0;
  if (state.from || state.to) n++;
  if (state.min || state.max) n++;
  if (state.direction && state.direction !== "all") n++;
  for (const key of ["category", "status", "method", "account"] as const) if (state[key]) n++;
  return n;
}

/** Removable chips that summarize active filters under the toolbar. */
export function ActiveFilterChips({ filters }: { filters: TransactionFiltersApi }) {
  const { state, selected, update, clearFilters } = filters;
  const { data: accounts } = useAccounts();
  const chips: { key: string; label: string; clear: () => void }[] = [];

  if (state.from || state.to) {
    chips.push({
      key: "date",
      label: `${state.from ? formatShortDate(state.from) : "Start"} – ${state.to ? formatShortDate(state.to) : "Today"}`,
      clear: () => update({ from: undefined, to: undefined }),
    });
  }
  if (state.direction && state.direction !== "all") {
    chips.push({
      key: "direction",
      label: state.direction === "in" ? "Money in" : "Money out",
      clear: () => update({ direction: undefined }),
    });
  }
  if (state.min || state.max) {
    chips.push({
      key: "amount",
      label: `$${state.min || "0"} – ${state.max ? `$${state.max}` : "any"}`,
      clear: () => update({ min: undefined, max: undefined }),
    });
  }
  for (const s of selected.status) {
    chips.push({
      key: `status-${s}`,
      label: STATUS_LABELS[s as keyof typeof STATUS_LABELS] ?? s,
      clear: () =>
        update({ status: selected.status.filter((x) => x !== s).join(",") || undefined }),
    });
  }
  for (const m of selected.method) {
    chips.push({
      key: `method-${m}`,
      label: METHOD_LABELS[m as keyof typeof METHOD_LABELS] ?? m,
      clear: () =>
        update({ method: selected.method.filter((x) => x !== m).join(",") || undefined }),
    });
  }
  for (const a of selected.account) {
    chips.push({
      key: `account-${a}`,
      label: accounts?.find((x) => x.id === a)?.name ?? "Account",
      clear: () =>
        update({ account: selected.account.filter((x) => x !== a).join(",") || undefined }),
    });
  }
  for (const c of selected.category) {
    chips.push({
      key: `category-${c}`,
      label: CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c,
      clear: () =>
        update({ category: selected.category.filter((x) => x !== c).join(",") || undefined }),
    });
  }

  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="outline"
          className="gap-1 bg-card py-1 pr-1 pl-2.5 text-[13px] text-foreground"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.clear}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={`Remove filter: ${chip.label}`}
          >
            <XIcon aria-hidden="true" />
          </button>
        </Badge>
      ))}
      <Button
        variant="link"
        size="sm"
        className="text-xs text-muted-foreground"
        onClick={clearFilters}
      >
        Clear all
      </Button>
    </div>
  );
}
