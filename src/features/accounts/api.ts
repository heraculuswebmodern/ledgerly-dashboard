"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Account } from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () => api.get<Account[]>("/accounts"),
  });
}
