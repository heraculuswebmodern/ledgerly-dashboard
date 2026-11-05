import { transactionQuerySchema } from "@/lib/contracts";
import { handler } from "@/server/http/handler";
import { exportTransactionsCsv } from "@/server/services/transactions";

export const GET = handler((ctx) => {
  const csv = exportTransactionsCsv(ctx, ctx.query(transactionQuerySchema));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledgerly-transactions-${ctx.today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
