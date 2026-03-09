"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { SignOutButton } from "@/components/sign-out-button";

type AppShellProps = {
  children: ReactNode;
  user: {
    email: string | null;
    fullName: string | null;
    role: string;
  };
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contacts", label: "Contacts" },
  { href: "/companies", label: "Companies" },
  { href: "/products", label: "Products" },
  { href: "/leads", label: "Leads" },
  { href: "/tasks", label: "Tasks" },
  { href: "/emails", label: "Emails" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="app-shell">
      <button
        type="button"
        aria-label="Close navigation menu"
        className={clsx("sidebar-backdrop", { "is-open": isSidebarOpen })}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className={clsx("sidebar", { open: isSidebarOpen })}>
        <div className="brand">
          <span className="brand-dot" />
          <span>CRM Food Trading</span>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx("nav-link", { active })}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <p className="small">Signed in as {user.fullName ?? user.email ?? "User"}</p>
          <p className="small">Role: {user.role}</p>
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
            Menu
          </button>
          <div className="mobile-user">
            <strong>{user.fullName ?? "User"}</strong>
            <span className="small">{user.role}</span>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

