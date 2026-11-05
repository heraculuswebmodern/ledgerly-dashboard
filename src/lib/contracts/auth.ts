import { z } from "zod";

import { safeText } from "./common";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address").max(120)),
  password: z.string().min(1, "Enter your password").max(200),
});
export type LoginInput = z.input<typeof loginSchema>;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
};

export const NOTIFICATION_PREFS = [
  "paymentsSent",
  "paymentsReceived",
  "cardTransactions",
  "lowBalance",
  "weeklySummary",
  "productUpdates",
] as const;
export type NotificationPref = (typeof NOTIFICATION_PREFS)[number];

export type Settings = {
  profile: { name: string; email: string; phone: string; title: string; timezone: string };
  security: { twoFactorEnabled: boolean; lastPasswordChange: string; sessions: number };
  notifications: Record<NotificationPref, { email: boolean; push: boolean }>;
  lowBalanceThresholdCents: number;
};

export const profileSchema = z.object({
  name: safeText(80).pipe(z.string().min(2, "Enter your full name")),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address").max(120)),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[\d\s().-]{7,20})?$/, "Enter a valid phone number"),
  title: safeText(60),
  timezone: z.string().max(60),
});
export type ProfileInput = z.input<typeof profileSchema>;

const channelPrefs = z.object({ email: z.boolean(), push: z.boolean() });

export const settingsPatchSchema = z
  .object({
    profile: profileSchema.optional(),
    security: z.object({ twoFactorEnabled: z.boolean() }).optional(),
    notifications: z.partialRecord(z.enum(NOTIFICATION_PREFS), channelPrefs).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");
export type SettingsPatch = z.input<typeof settingsPatchSchema>;
