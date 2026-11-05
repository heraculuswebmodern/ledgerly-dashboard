"use client";

import { ArrowLeftRightIcon, ArrowRightIcon, SendIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

import { RecipientsPanel } from "./recipients-panel";
import { ScheduledPanel } from "./scheduled-panel";
import { TransferDialog } from "./transfer-dialog";

function ActionTile({
  icon: Icon,
  title,
  description,
  onClick,
  featured,
}: {
  icon: typeof SendIcon;
  title: string;
  description: string;
  onClick: () => void;
  featured?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        featured
          ? "group relative isolate flex items-start gap-4 overflow-hidden rounded-xl bg-hero p-5 text-left text-hero-foreground shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          : "group flex items-start gap-4 rounded-xl border bg-card p-5 text-left shadow-card outline-none hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
      }
    >
      {featured && <span className="absolute inset-0 -z-10 ledger-lines" aria-hidden="true" />}
      <span
        className={
          featured
            ? "flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-ink"
            : "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted"
        }
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        <span
          className={
            featured
              ? "mt-0.5 block text-sm text-hero-muted"
              : "mt-0.5 block text-sm text-muted-foreground"
          }
        >
          {description}
        </span>
      </span>
      <ArrowRightIcon
        className="mt-1 size-4 opacity-60 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </button>
  );
}

export function PaymentsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const transferOpen = params.get("new") === "1";
  const kind = params.get("kind") === "internal" ? "internal" : "external";
  const recipientId = params.get("recipient") ?? undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Pay vendors, move money between accounts and manage who you pay."
        actions={
          <Button
            variant="brand"
            onClick={() => set({ new: "1", kind: undefined, recipient: undefined })}
          >
            <SendIcon aria-hidden="true" /> Send money
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        <ActionTile
          featured
          icon={SendIcon}
          title="Pay a recipient"
          description="ACH in 1–2 business days or same-day wire. No fees."
          onClick={() => set({ new: "1", kind: undefined })}
        />
        <ActionTile
          icon={ArrowLeftRightIcon}
          title="Move between accounts"
          description="Instant transfers between Operating, Reserve and Treasury."
          onClick={() => set({ new: "1", kind: "internal", recipient: undefined })}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <RecipientsPanel
          addOpen={params.get("add") === "1"}
          onAddOpenChange={(open) => set({ add: open ? "1" : undefined, tab: undefined })}
          onPay={(id) => set({ new: "1", kind: undefined, recipient: id })}
        />
        <ScheduledPanel />
      </div>

      <TransferDialog
        open={transferOpen}
        preset={{ kind, recipientId }}
        onClose={() => set({ new: undefined, kind: undefined, recipient: undefined })}
      />
    </div>
  );
}
