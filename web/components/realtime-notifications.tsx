"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/locale-provider";
import { pushNotification } from "@/lib/notifications";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function RealtimeNotifications() {
  const { tr } = useLocale();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let connectedAtLeastOne = false;

    const leadsChannel = supabase
      .channel(`live-leads-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload) => {
        const row = payload.new as { title?: string };
        pushNotification({
          title: tr("New lead created"),
          detail: row.title ?? tr("A new lead was added"),
          level: "success",
        });
      })
      .subscribe(() => {
        connectedAtLeastOne = true;
      });

    const tasksChannel = supabase
      .channel(`live-tasks-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks" }, (payload) => {
        const row = payload.new as { title?: string };
        pushNotification({
          title: tr("New task created"),
          detail: row.title ?? tr("A new task was added"),
          level: "info",
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks" }, (payload) => {
        const row = payload.new as { title?: string; status?: string };
        pushNotification({
          title: tr("Task updated"),
          detail: `${row.title ?? "Task"} -> ${row.status ?? "updated"}`,
          level: row.status === "done" ? "success" : "info",
        });
      })
      .subscribe(() => {
        connectedAtLeastOne = true;
      });

    const emailsChannel = supabase
      .channel(`live-email-logs-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "email_logs" }, (payload) => {
        const row = payload.new as { recipient_email?: string; status?: string };
        const recipient = row.recipient_email ?? "recipient";
        const isFailure = row.status === "failed";
        pushNotification({
          title: isFailure ? tr("Email failed") : tr("Email log added"),
          detail: `${recipient} (${row.status ?? "pending"})`,
          level: isFailure ? "danger" : "info",
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "email_logs" }, (payload) => {
        const row = payload.new as { recipient_email?: string; open_count?: number; click_count?: number };
        const recipient = row.recipient_email ?? "recipient";
        if ((row.click_count ?? 0) > 0) {
          pushNotification({
            title: tr("Email clicked"),
            detail: `${recipient} clicked at least one link`,
            level: "success",
          });
        } else if ((row.open_count ?? 0) > 0) {
          pushNotification({
            title: tr("Email opened"),
            detail: `${recipient} opened an email`,
            level: "success",
          });
        }
      })
      .subscribe(() => {
        connectedAtLeastOne = true;
      });

    const alertInterval = setInterval(async () => {
      const res = await fetch("/api/dashboard?range=7d", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        deadlineAlerts?: Array<{ title: string; kind: "overdue" | "due_soon"; dueDate: string }>;
      };
      const alert = json.deadlineAlerts?.[0];
      if (!alert) return;
      const dueLabel = new Date(alert.dueDate).toLocaleString();
      pushNotification({
        title: alert.kind === "overdue" ? tr("Overdue task alert") : tr("Upcoming deadline"),
        detail: `${alert.title} (${dueLabel})`,
        level: alert.kind === "overdue" ? "warning" : "info",
      });
    }, 120000);

    const fallbackTimer = setTimeout(() => {
      if (!connectedAtLeastOne) {
        pushNotification({
          title: tr("Notifications"),
          detail: tr("Polling fallback"),
          level: "info",
        });
      }
    }, 6000);

    return () => {
      clearInterval(alertInterval);
      clearTimeout(fallbackTimer);
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(emailsChannel);
    };
  }, [tr]);

  return null;
}
