"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Notification, SearchResults, SessionUser } from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";

export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: () => api.get<{ user: SessionUser }>("/auth/session").then((r) => r.user),
    staleTime: 5 * 60_000,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => api.get<Notification[]>("/notifications"),
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/notifications/read"),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      queryClient.setQueryData<Notification[]>(queryKeys.notifications, (prev) =>
        prev?.map((n) => ({ ...n, read: true })),
      );
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSettled: () => {
      queryClient.clear();
      // A full reload guarantees no cached account data survives sign-out.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    },
  });
}

export function useSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.search(q),
    queryFn: () => api.get<SearchResults>("/search", { q }),
    enabled: q.trim().length >= 2,
    placeholderData: (prev) => prev,
    staleTime: 10_000,
  });
}
