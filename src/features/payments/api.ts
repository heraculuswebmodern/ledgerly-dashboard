"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import type {
  Recipient,
  RecipientInput,
  RecipientUpdateInput,
  ScheduledPayment,
  TransferInput,
  TransferResult,
} from "@/lib/contracts";
import { ledgerKeys, queryKeys } from "@/lib/query-keys";

export function invalidateLedger(queryClient: QueryClient) {
  return Promise.all(ledgerKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function useRecipients() {
  return useQuery({
    queryKey: queryKeys.recipients,
    queryFn: () => api.get<Recipient[]>("/recipients"),
  });
}

export function useScheduled() {
  return useQuery({
    queryKey: queryKeys.scheduled,
    queryFn: () => api.get<ScheduledPayment[]>("/scheduled"),
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TransferInput) => api.post<TransferResult>("/transfers", input),
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function useCancelScheduled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/scheduled/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.scheduled });
      const previous = queryClient.getQueryData<ScheduledPayment[]>(queryKeys.scheduled);
      queryClient.setQueryData<ScheduledPayment[]>(queryKeys.scheduled, (list) =>
        list?.filter((s) => s.id !== id),
      );
      return { previous };
    },
    onError: (error, _id, context) => {
      queryClient.setQueryData(queryKeys.scheduled, context?.previous);
      toast.error(error.message);
    },
    onSuccess: () => toast.success("Scheduled payment cancelled"),
    onSettled: () => invalidateLedger(queryClient),
  });
}

export function useSaveRecipient(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecipientInput | RecipientUpdateInput) =>
      id
        ? api.patch<Recipient>(`/recipients/${id}`, input)
        : api.post<Recipient>("/recipients", input),
    onSuccess: (recipient) => {
      queryClient.setQueryData<Recipient[]>(queryKeys.recipients, (list) => {
        if (!list) return list;
        const others = list.filter((r) => r.id !== recipient.id);
        return [...others, recipient].sort((a, b) => a.name.localeCompare(b.name));
      });
      toast.success(id ? "Recipient updated" : `${recipient.name} added`);
    },
  });
}

export function useDeleteRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipient: Recipient) => api.delete(`/recipients/${recipient.id}`),
    onMutate: async (recipient) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.recipients });
      const previous = queryClient.getQueryData<Recipient[]>(queryKeys.recipients);
      queryClient.setQueryData<Recipient[]>(queryKeys.recipients, (list) =>
        list?.filter((r) => r.id !== recipient.id),
      );
      return { previous };
    },
    onError: (error, _r, context) => {
      queryClient.setQueryData(queryKeys.recipients, context?.previous);
      toast.error(error.message);
    },
    onSuccess: (_data, recipient) => toast.success(`${recipient.name} removed`),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.recipients });
      void queryClient.invalidateQueries({ queryKey: queryKeys.scheduled });
    },
  });
}
