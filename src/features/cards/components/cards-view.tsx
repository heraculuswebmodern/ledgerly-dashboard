"use client";

import { CreditCardIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { Card as CardModel } from "@/lib/contracts";
import { formatMoney, sumCents } from "@/lib/money";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

import { useCards } from "../api";
import { CardDetails } from "./card-details";
import { PaymentCard } from "./payment-card";

type Filter = "all" | "virtual" | "physical" | "frozen";

export function CardsView() {
  const { data, isLoading, isError, refetch } = useCards();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const desktop = useMediaQuery("(min-width: 1024px)");

  const filter = (params.get("filter") as Filter | null) ?? "all";
  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const cards = (data ?? []).filter((c) =>
    filter === "all" ? true : filter === "frozen" ? c.status === "frozen" : c.kind === filter,
  );
  const selectedId = params.get("card") ?? (desktop ? cards[0]?.id : undefined);
  const selected = data?.find((c) => c.id === selectedId) ?? null;
  const totalSpent = sumCents((data ?? []).map((c) => c.spentThisMonthCents));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cards"
        description="Virtual and physical cards with per-card limits and instant controls."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Spent this month", data ? formatMoney(totalSpent, { hideCents: true }) : null],
          ["Active cards", data ? String(data.filter((c) => c.status === "active").length) : null],
          ["Frozen", data ? String(data.filter((c) => c.status === "frozen").length) : null],
          [
            "Virtual / physical",
            data
              ? `${data.filter((c) => c.kind === "virtual").length} / ${data.filter((c) => c.kind === "physical").length}`
              : null,
          ],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-[13px] text-muted-foreground">{label}</p>
            {value === null ? (
              <Skeleton className="mt-2 h-6 w-20" />
            ) : (
              <p className="mt-1 tabular text-xl font-semibold tracking-tight">{value}</p>
            )}
          </Card>
        ))}
      </div>

      <Segmented
        aria-label="Filter cards"
        value={filter}
        onValueChange={(v) => setParam("filter", v === "all" ? undefined : v)}
        options={[
          { value: "all", label: "All" },
          { value: "virtual", label: "Virtual" },
          { value: "physical", label: "Physical" },
          { value: "frozen", label: "Frozen" },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {isError ? (
          <Card>
            <ErrorState onRetry={() => refetch()} />
          </Card>
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-[1.586] rounded-2xl" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <Card>
            <EmptyState icon={CreditCardIcon} title="No cards match this filter" />
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2" aria-label="Cards">
            {cards.map((card) => (
              <li key={card.id}>
                <CardTile
                  card={card}
                  selected={card.id === selected?.id}
                  onSelect={() => setParam("card", card.id)}
                />
              </li>
            ))}
          </ul>
        )}

        {desktop && selected && (
          <Card className="sticky top-24 p-5">
            <CardDetails key={selected.id} card={selected} />
          </Card>
        )}
      </div>

      {!desktop && (
        <Sheet open={!!selected} onOpenChange={(open) => !open && setParam("card", undefined)}>
          <SheetContent side="bottom" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selected?.nickname}</SheetTitle>
              <SheetDescription>Card controls and details</SheetDescription>
            </SheetHeader>
            <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              {selected && <CardDetails key={selected.id} card={selected} />}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function CardTile({
  card,
  selected,
  onSelect,
}: {
  card: CardModel;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${card.nickname}, ${card.kind} card ending ${card.last4}, ${card.status}`}
      className={cn(
        "group w-full rounded-[1.1rem] p-1 text-left transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "ring-2 ring-teal" : "hover:ring-1 hover:ring-border",
      )}
    >
      <PaymentCard card={card} className="transition-transform group-hover:-translate-y-0.5" />
      <div className="flex items-center justify-between px-1.5 pt-2.5 pb-1">
        <span className="text-xs text-muted-foreground">
          <span className="tabular">
            {formatMoney(card.spentThisMonthCents, { hideCents: true })}
          </span>{" "}
          of{" "}
          <span className="tabular">
            {formatMoney(card.monthlyLimitCents, { hideCents: true })}
          </span>
        </span>
        {card.status === "frozen" ? (
          <Badge variant="info">Frozen</Badge>
        ) : (
          <Badge variant="positive">Active</Badge>
        )}
      </div>
    </button>
  );
}
