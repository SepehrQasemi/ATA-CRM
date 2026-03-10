"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLocale } from "@/components/locale-provider";

type LiveNotification = {
  id: string;
  title: string;
  detail: string;
  level: "info" | "warning" | "success" | "danger";
  at: string;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function RealtimeNotifications() {
  const { tr } = useLocale();
  const [items, setItems] = useState<LiveNotification[]>([]);
  const [status, setStatus] = useState<"connecting" | "connected" | "fallback">("connecting");

  function pushNotification(
    title: string,
    detail: string,
    level: LiveNotification["level"] = "info",
  ) {
    setItems((prev) => {
      const next = [{ id: makeId(), title, detail, level, at: new Date().toISOString() }, ...prev];
      return next.slice(0, 10);
    });
  }

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let connectedAtLeastOne = false;

    const leadsChannel = supabase
      .channel(`live-leads-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload) => {
        const row = payload.new as { title?: string };
        pushNotification(tr("New lead created"), row.title ?? tr("A new lead was added"), "success");
      })
      .subscribe((channelStatus) => {
        if (channelStatus === "SUBSCRIBED") {
          connectedAtLeastOne = true;
          setStatus("connected");
        }
      });

    const tasksChannel = supabase
      .channel(`live-tasks-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks" }, (payload) => {
        const row = payload.new as { title?: string };
        pushNotification(tr("New task created"), row.title ?? tr("A new task was added"), "info");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks" }, (payload) => {
        const row = payload.new as { title?: string; status?: string };
        pushNotification(
          tr("Task updated"),
          `${row.title ?? "Task"} -> ${row.status ?? "updated"}`,
          row.status === "done" ? "success" : "info",
        );
      })
      .subscribe((channelStatus) => {
        if (channelStatus === "SUBSCRIBED") {
          connectedAtLeastOne = true;
          setStatus("connected");
        }
      });

    const emailsChannel = supabase
      .channel(`live-email-logs-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "email_logs" },
        (payload) => {
          const row = payload.new as { recipient_email?: string; status?: string };
          const recipient = row.recipient_email ?? "recipient";
          const isFailure = row.status === "failed";
          pushNotification(
            isFailure ? tr("Email failed") : tr("Email log added"),
            `${recipient} (${row.status ?? "pending"})`,
            isFailure ? "danger" : "info",
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "email_logs" },
        (payload) => {
          const row = payload.new as { recipient_email?: string; open_count?: number; click_count?: number };
          const recipient = row.recipient_email ?? "recipient";
          if ((row.click_count ?? 0) > 0) {
            pushNotification(tr("Email clicked"), `${recipient} clicked at least one link`, "success");
          } else if ((row.open_count ?? 0) > 0) {
            pushNotification(tr("Email opened"), `${recipient} opened an email`, "success");
          }
        },
      )
      .subscribe((channelStatus) => {
        if (channelStatus === "SUBSCRIBED") {
          connectedAtLeastOne = true;
          setStatus("connected");
        }
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
      pushNotification(
        alert.kind === "overdue" ? tr("Overdue task alert") : tr("Upcoming deadline"),
        `${alert.title} (${dueLabel})`,
        alert.kind === "overdue" ? "warning" : "info",
      );
    }, 120000);

    const fallbackTimer = setTimeout(() => {
      if (!connectedAtLeastOne) {
        setStatus("fallback");
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

  const statusLabel = useMemo(() => {
    if (status === "connected") return tr("Live");
    if (status === "connecting") return tr("Connecting");
    return tr("Polling fallback");
  }, [status, tr]);

  return (
    <section className="panel realtime-notify">
      <div className="inline-actions">
        <h2>{tr("Notifications")}</h2>
        <span className={`notify-status notify-status-${status}`}>{statusLabel}</span>
        {items.length > 0 ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setItems([])}
          >
            {tr("Clear")}
          </button>
        ) : null}
      </div>
      <div className="notify-list">
        {items.length === 0 ? (
          <p className="small">{tr("No recent notifications yet.")}</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className={`notify-item notify-${item.level}`}>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              <span className="small">{new Date(item.at).toLocaleTimeString()}</span>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
