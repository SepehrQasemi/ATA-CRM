"use client";

import Link from "next/link";
import { useState } from "react";
import { AppNotification } from "@/lib/notifications";

type NotificationBellProps = {
  items: AppNotification[];
};

export function NotificationBell({ items }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const unread = items.length;

  return (
    <div
      className="notification-bell"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link href="/notifications" aria-label="Open notifications page" className="btn btn-secondary bell-trigger">
        <span className="bell-glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
            <path
              d="M12 3a5 5 0 0 0-5 5v2.6c0 .9-.3 1.7-.9 2.4L4.8 15c-.7.8-.1 2 .9 2h12.6c1 0 1.6-1.2.9-2l-1.3-1.6a3.7 3.7 0 0 1-.9-2.4V8a5 5 0 0 0-5-5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9.5 19a2.5 2.5 0 0 0 5 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
        {unread > 0 ? <span className="bell-badge">{Math.min(unread, 99)}</span> : null}
      </Link>

      {open ? (
        <section className="notification-preview panel stack" role="dialog" aria-label="Notification preview">
          <h3>Notifications</h3>
          {items.length === 0 ? <p className="small">No recent notifications yet.</p> : null}
          {items.slice(0, 5).map((item) => (
            <article key={item.id} className={`notify-item notify-${item.level}`}>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
          <Link href="/notifications" className="btn btn-secondary">
            View all notifications
          </Link>
        </section>
      ) : null}
    </div>
  );
}
