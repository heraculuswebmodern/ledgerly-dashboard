import "server-only";

import type { Settings, settingsPatchSchema } from "@/lib/contracts";
import { notificationsRepo, settingsRepo } from "@/server/repositories";

import type { ServiceContext } from "./context";

import type { z } from "zod";

export function getSettings(ctx: ServiceContext): Settings {
  return settingsRepo.get(ctx.db);
}

export function updateSettings(
  ctx: ServiceContext,
  patch: z.output<typeof settingsPatchSchema>,
): Settings {
  const before = settingsRepo.get(ctx.db).security.twoFactorEnabled;
  const settings = settingsRepo.update(ctx.db, (s) => {
    if (patch.profile) s.profile = { ...s.profile, ...patch.profile };
    if (patch.security) s.security = { ...s.security, ...patch.security };
    if (patch.notifications) {
      for (const [key, value] of Object.entries(patch.notifications)) {
        if (value) s.notifications[key as keyof Settings["notifications"]] = value;
      }
    }
  });
  if (patch.security && patch.security.twoFactorEnabled !== before) {
    notificationsRepo.push(ctx.db, {
      kind: "security",
      title: patch.security.twoFactorEnabled
        ? "Two-factor authentication on"
        : "Two-factor authentication off",
      body: patch.security.twoFactorEnabled
        ? "Sign-ins now require a code from your authenticator app."
        : "Your account is protected by password only. We recommend turning 2FA back on.",
      createdAt: ctx.now.toISOString(),
      href: "/settings",
    });
  }
  return settings;
}
