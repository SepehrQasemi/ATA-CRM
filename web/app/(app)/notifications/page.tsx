"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import {
  AppNotification,
  clearNotifications,
  readNotifications,
  removeNotification,
  subscribeNotifications,
} from "@/lib/notifications";

export default function NotificationsPage() {
  const { tr } = useLocale();
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    const sync = () => setItems(readNotifications());
    sync();
    return subscribeNotifications(sync);
  }, []);

  return (
    <div className="stack">
      <section className="page-head">
        <h1>{tr("Notifications")}</h1>
        <p>{tr("Review activity alerts and clean up old notifications.")}</p>
      </section>

      <section className="panel stack">
        <div className="inline-actions action-between">
          <p className="small">{tr("Total: {count}", { count: items.length })}</p>
          <button className="btn btn-secondary" type="button" onClick={() => clearNotifications()}>
            {tr("Clear all")}
          </button>
        </div>

        {items.length === 0 ? <p className="small">{tr("No recent notifications yet.")}</p> : null}

        {items.map((item) => (
          <article key={item.id} className={`notify-item notify-${item.level}`}>
            <div className="inline-actions action-between">
              <strong>{item.title}</strong>
              <button className="btn btn-secondary" type="button" onClick={() => removeNotification(item.id)}>
                {tr("Delete")}
              </button>
            </div>
            <p>{item.detail}</p>
            <span className="small">{new Date(item.at).toLocaleString()}</span>
          </article>
        ))}
      </section>
    </div>
  );
}
