"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BrandLogo } from "@/components/brand-logo";
import { GlobalSearch } from "@/components/global-search";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/components/locale-provider";
import { SignOutButton } from "@/components/sign-out-button";
import { NotificationBell } from "@/components/notification-bell";
import { RealtimeNotifications } from "@/components/realtime-notifications";
import { roleLabel } from "@/lib/i18n";
import { AppNotification, readNotifications, subscribeNotifications } from "@/lib/notifications";

type AppShellProps = {
  children: ReactNode;
  user: {
    email: string | null;
    fullName: string | null;
    role: string;
  };
};

const baseNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/colleagues", label: "Colleagues" },
  { href: "/contacts", label: "Contacts" },
  { href: "/companies", label: "Companies" },
  { href: "/products", label: "Products" },
  { href: "/leads", label: "Leads" },
  { href: "/tasks", label: "Tasks" },
  { href: "/emails", label: "Emails" },
  { href: "/profile", label: "My Profile" },
  { href: "/help", label: "Help" },
];

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const { tr, locale } = useLocale();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const canSeeAccess = user.role === "admin" || user.role === "manager";
  const navItems = canSeeAccess
    ? [...baseNavItems.slice(0, 8), { href: "/access", label: "Access" }, ...baseNavItems.slice(8)]
    : baseNavItems;

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const sync = () => setNotifications(readNotifications());
    sync();
    return subscribeNotifications(sync);
  }, []);

  return (
    <div className="app-shell">
      <button
        type="button"
        aria-label="Close navigation menu"
        className={clsx("sidebar-backdrop", { "is-open": isSidebarOpen })}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className={clsx("sidebar", { open: isSidebarOpen })}>
        <BrandLogo compact />
        <LanguageSwitcher compact />
        <nav className="nav-list">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx("nav-link", { active })}
              >
                {tr(item.label)}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <p className="small">
            {tr("Signed in as {name}", { name: user.fullName ?? user.email ?? tr("User") })}
          </p>
          <p className="small">{tr("Role: {role}", { role: roleLabel(user.role, locale) })}</p>
          <SignOutButton />
        </div>
      </aside>

      <main className="main-content">
        <div className="mobile-topbar">
          <button
            type="button"
            className="btn btn-secondary mobile-menu-btn"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            {tr("Menu")}
          </button>
          <div className="mobile-user">
            <strong>{user.fullName ?? tr("User")}</strong>
            <span className="small">{roleLabel(user.role, locale)}</span>
          </div>
          <LanguageSwitcher compact />
        </div>
        <div className="app-toolbar">
          <GlobalSearch />
          <div className="inline-actions">
            <Link href="/help" className="btn btn-secondary">
              {tr("Open Help Center")}
            </Link>
            <NotificationBell items={notifications} />
          </div>
        </div>
        <RealtimeNotifications />
        {children}
      </main>
    </div>
  );
}

