/**
 * Generates the deterministic demo dataset and writes a snapshot to .data/seed.json.
 * The app seeds itself in memory at runtime; this script exists to inspect the data
 * and to prove determinism (run it twice and diff the output).
 *
 *   npm run seed              # seed relative to today
 *   npm run seed -- 2026-01-31  # seed relative to a fixed date
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { formatMoney, sumCents } from "../src/lib/money";
import { generateSeed } from "../src/server/db/seed";

const arg = process.argv[2];
const now = arg ? new Date(`${arg}T12:00:00Z`) : new Date();
const db = generateSeed({ now });

const outDir = join(process.cwd(), ".data");
mkdirSync(outDir, { recursive: true });
const file = join(outDir, "seed.json");
writeFileSync(file, JSON.stringify(db, null, 2));

const posted = db.transactions.filter((t) => t.status === "posted");
console.log(`Seeded Ledgerly demo data relative to ${now.toISOString().slice(0, 10)}`);
console.table(
  db.accounts.map((a) => ({
    account: `${a.name} ••${a.last4}`,
    balance: formatMoney(
      a.openingBalanceCents +
        sumCents(posted.filter((t) => t.accountId === a.id).map((t) => t.amountCents)),
    ),
  })),
);
console.log(
  `${db.transactions.length} transactions · ${db.cards.length} cards · ${db.recipients.length} recipients · ${db.scheduled.length} scheduled payments`,
);
console.log(`Snapshot written to ${file}`);
