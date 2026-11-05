import type { Database } from "@/server/db/types";

/** What every service needs: the session-scoped database and a consistent clock. */
export type ServiceContext = {
  db: Database;
  now: Date;
  /** YYYY-MM-DD (UTC) */
  today: string;
};
