import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Transaction } from "@/lib/contracts";
import { TransactionListItem } from "@/features/transactions/components/transaction-list-item";

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle>Recent activity</CardTitle>
        <Button asChild variant="ghost" size="sm" className="-mr-2 text-muted-foreground">
          <Link href="/transactions">
            View all <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-3 pt-2 pb-3">
        {transactions.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <ul>
            {transactions.map((t) => (
              <li key={t.id}>
                <TransactionListItem transaction={t} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
