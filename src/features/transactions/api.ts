"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import type {
  Transaction,
  TransactionPage,
  TransactionQueryInput,
  UpdateTransactionInput,
} from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";

export function useTransactions(query: TransactionQueryInput) {
  return useQuery({
    queryKey: queryKeys.transactionList(query),
    queryFn: () => api.get<TransactionPage>("/transactions", query),
    placeholderData: keepPreviousData,
  });
}

export function useTransaction(id: string | null) {
  return useQuery({
    queryKey: queryKeys.transaction(id ?? ""),
    queryFn: () => api.get<Transaction>(`/transactions/${id}`),
    enabled: !!id,
  });
}

export function useUpdateTransaction(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTransactionInput) =>
      api.patch<Transaction>(`/transactions/${id}`, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transaction(id) });
      const previous = queryClient.getQueryData<Transaction>(queryKeys.transaction(id));
      if (previous) {
        queryClient.setQueryData<Transaction>(queryKeys.transaction(id), {
          ...previous,
          ...input,
        } as Transaction);
      }
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.transaction(id), context.previous);
      toast.error(error.message);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.transaction(id), updated);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.transactions,
        refetchType: "active",
      });
      void queryClient.invalidateQueries({ queryKey: ["spending"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
