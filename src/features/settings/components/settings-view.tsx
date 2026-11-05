"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRoundIcon, Loader2Icon, MonitorSmartphoneIcon, ShieldCheckIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  NOTIFICATION_PREFS,
  profileSchema,
  type NotificationPref,
  type ProfileInput,
  type Settings,
} from "@/lib/contracts";
import { formatDate } from "@/lib/dates";

import { useSettings, useUpdateSettings } from "../api";

const TIMEZONES = [
  ["America/Los_Angeles", "Pacific Time (US)"],
  ["America/Denver", "Mountain Time (US)"],
  ["America/Chicago", "Central Time (US)"],
  ["America/New_York", "Eastern Time (US)"],
  ["Europe/London", "London"],
  ["Europe/Berlin", "Berlin"],
  ["Asia/Singapore", "Singapore"],
] as const;

const PREF_COPY: Record<NotificationPref, { label: string; hint: string }> = {
  paymentsSent: { label: "Payments sent", hint: "When an ACH, wire or transfer leaves an account" },
  paymentsReceived: { label: "Payments received", hint: "Incoming deposits and wires" },
  cardTransactions: { label: "Card transactions", hint: "Every card authorization" },
  lowBalance: { label: "Low balance", hint: "When Operating drops below your threshold" },
  weeklySummary: { label: "Weekly summary", hint: "Cash position every Monday morning" },
  productUpdates: { label: "Product updates", hint: "New Ledgerly features, at most monthly" },
};

export function SettingsView() {
  const { data, isLoading, isError, refetch } = useSettings();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your profile, security and notifications." />
      {isError ? (
        <Card>
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : isLoading || !data ? (
        <div className="space-y-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ProfileCard settings={data} />
          <div className="space-y-6">
            <SecurityCard settings={data} />
            <NotificationsCard settings={data} />
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileCard({ settings }: { settings: Settings }) {
  const update = useUpdateSettings();
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: settings.profile,
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    const saved = await update.mutateAsync({ profile: values }).catch(() => null);
    if (saved) form.reset(saved.profile);
  });

  const field = (name: keyof ProfileInput, label: string, props: React.ComponentProps<"input">) => (
    <div className="space-y-1.5">
      <Label htmlFor={`profile-${name}`}>{label}</Label>
      <Input
        id={`profile-${name}`}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `profile-${name}-error` : undefined}
        {...props}
        {...form.register(name)}
      />
      {errors[name] && (
        <p id={`profile-${name}-error`} className="text-xs text-negative" role="alert">
          {errors[name]?.message}
        </p>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Shown to teammates and on payment approvals.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("name", "Full name", { autoComplete: "name" })}
            {field("title", "Job title", { autoComplete: "organization-title" })}
          </div>
          {field("email", "Work email", { type: "email", autoComplete: "email" })}
          {field("phone", "Phone", {
            type: "tel",
            autoComplete: "tel",
            placeholder: "+1 415 555 0100",
          })}
          <div className="space-y-1.5">
            <Label htmlFor="profile-timezone">Time zone</Label>
            <Controller
              control={form.control}
              name="timezone"
              render={({ field: f }) => (
                <Select value={f.value} onValueChange={f.onChange}>
                  <SelectTrigger id="profile-timezone" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={!isDirty || update.isPending}
              onClick={() => form.reset(settings.profile)}
            >
              Discard
            </Button>
            <Button type="submit" disabled={!isDirty || update.isPending}>
              {update.isPending && update.variables?.profile && (
                <Loader2Icon className="animate-spin" aria-hidden="true" />
              )}
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SecurityCard({ settings }: { settings: Settings }) {
  const update = useUpdateSettings();
  const enabled = settings.security.twoFactorEnabled;
  return (
    <Card id="security" className="scroll-mt-24">
      <CardHeader>
        <div>
          <CardTitle>Security</CardTitle>
          <CardDescription>Protect sign-in and money movement.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="divide-y">
        <div className="flex items-start justify-between gap-4 pb-4">
          <div className="flex gap-3">
            <ShieldCheckIcon className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
            <div>
              <Label htmlFor="two-factor" className="flex items-center gap-2">
                Two-factor authentication
                {enabled ? (
                  <Badge variant="positive">On</Badge>
                ) : (
                  <Badge variant="pending">Off</Badge>
                )}
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Require an authenticator code at sign-in and before sending over $10,000. Demo only,
                no code is sent.
              </p>
            </div>
          </div>
          <Switch
            id="two-factor"
            checked={enabled}
            onCheckedChange={(checked) =>
              update.mutate({ security: { twoFactorEnabled: checked } })
            }
          />
        </div>
        <div className="flex items-center gap-3 py-4 text-sm">
          <KeyRoundIcon className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="flex-1">Password</p>
          <p className="text-xs text-muted-foreground">
            Changed {formatDate(settings.security.lastPasswordChange)}
          </p>
        </div>
        <div className="flex items-center gap-3 pt-4 text-sm">
          <MonitorSmartphoneIcon className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="flex-1">Active sessions</p>
          <p className="tabular text-xs text-muted-foreground">
            {settings.security.sessions} devices
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsCard({ settings }: { settings: Settings }) {
  const update = useUpdateSettings();
  const set = (key: NotificationPref, channel: "email" | "push", value: boolean) =>
    update.mutate({
      notifications: { [key]: { ...settings.notifications[key], [channel]: value } },
    });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose what reaches you, and where.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <caption className="sr-only">Notification preferences by channel</caption>
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th scope="col" className="pb-2 text-left font-medium">
                Event
              </th>
              <th scope="col" className="w-16 pb-2 text-center font-medium">
                Email
              </th>
              <th scope="col" className="w-16 pb-2 text-center font-medium">
                Push
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {NOTIFICATION_PREFS.map((key) => (
              <tr key={key}>
                <th scope="row" className="py-3 pr-3 text-left font-normal">
                  <p className="font-medium">{PREF_COPY[key].label}</p>
                  <p className="text-xs text-muted-foreground">{PREF_COPY[key].hint}</p>
                </th>
                {(["email", "push"] as const).map((channel) => (
                  <td key={channel} className="text-center">
                    <Switch
                      aria-label={`${PREF_COPY[key].label} by ${channel}`}
                      checked={settings.notifications[key][channel]}
                      onCheckedChange={(v) => set(key, channel, v)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
