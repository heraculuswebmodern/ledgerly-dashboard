"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, ApiClientError } from "@/lib/api-client";
import type { Settings, SettingsPatch } from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => api.get<Settings>("/settings"),
  });
}

/**
 * Patches settings. Toggles update optimistically so switches feel instant; the server
 * response replaces the cache, and a failure rolls back.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => api.patch<Settings>("/settings", patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings });
      const previous = queryClient.getQueryData<Settings>(queryKeys.settings);
      if (previous && !patch.profile) {
        queryClient.setQueryData<Settings>(queryKeys.settings, {
          ...previous,
          security: { ...previous.security, ...patch.security },
          notifications: { ...previous.notifications, ...patch.notifications },
        });
      }
      return { previous };
    },
    onError: (error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.settings, context.previous);
      toast.error(error instanceof ApiClientError ? error.message : "Couldn't save settings");
    },
    onSuccess: (settings, patch) => {
      queryClient.setQueryData(queryKeys.settings, settings);
      if (patch.profile) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.session });
        toast.success("Profile saved");
      }
      if (patch.security) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
        toast.success(
          patch.security.twoFactorEnabled
            ? "Two-factor authentication is on"
            : "Two-factor authentication is off",
        );
      }
    },
  });
}
