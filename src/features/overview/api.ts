"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type {
  CashFlowRange,
  CashFlowSeries,
  CategorySpend,
  OverviewSummary,
} from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";

export function useOverview() {
  return useQuery({
    queryKey: queryKeys.overview,
    queryFn: () => api.get<OverviewSummary>("/overview"),
  });
}

export function useCashFlow(range: CashFlowRange) {
  return useQuery({
    queryKey: queryKeys.cashFlow(range),
    queryFn: () => api.get<CashFlowSeries>("/cash-flow", { range }),
    placeholderData: keepPreviousData,
  });
}

export function useSpending(days: number) {
  return useQuery({
    queryKey: queryKeys.spending(days),
    queryFn: () => api.get<CategorySpend[]>("/spending", { days }),
    placeholderData: keepPreviousData,
  });
}
