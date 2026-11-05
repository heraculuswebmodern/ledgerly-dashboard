"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { AnalyticsPeriod, AnalyticsReport } from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";

export function useAnalytics(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: queryKeys.analytics(period),
    queryFn: () => api.get<AnalyticsReport>("/analytics", { period }),
    placeholderData: keepPreviousData,
  });
}
