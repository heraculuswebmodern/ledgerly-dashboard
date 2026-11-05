"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import type { Card, CardSecrets, UpdateCardInput } from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";

export function useCards() {
  return useQuery({ queryKey: queryKeys.cards, queryFn: () => api.get<Card[]>("/cards") });
}

export function useUpdateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateCardInput & { id: string }) =>
      api.patch<Card>(`/cards/${id}`, input),
    onMutate: async ({ id, ...input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cards });
      const previous = queryClient.getQueryData<Card[]>(queryKeys.cards);
      queryClient.setQueryData<Card[]>(queryKeys.cards, (cards) =>
        cards?.map((c) => (c.id === id ? ({ ...c, ...input } as Card) : c)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(queryKeys.cards, context?.previous);
      toast.error(error.message);
    },
    onSuccess: (card, vars) => {
      if (vars.status) {
        toast.success(
          card.status === "frozen"
            ? `${card.nickname} is frozen`
            : `${card.nickname} is active again`,
          {
            description:
              card.status === "frozen" ? "New authorizations will be declined." : undefined,
          },
        );
      } else if (vars.monthlyLimitCents) {
        toast.success("Spending limit updated");
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cards });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useRevealCard() {
  return useMutation({
    mutationFn: (id: string) => api.post<CardSecrets>(`/cards/${id}/reveal`),
    onError: (error) => toast.error(error.message),
  });
}
