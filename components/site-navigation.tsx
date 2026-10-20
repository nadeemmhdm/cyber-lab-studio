"use client";

import Link from "next/link";
import { useState } from "react";
import type { RoleType } from "@prisma/client";
import { Award, BookOpen, Gauge, HeartPulse, History, LifeBuoy, Menu, MessageCircleQuestion, Settings, UserRound, UsersRound, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

type Props = { signedIn: boolean; roles: RoleType[] };
type NavItem = { href: string; label: string; icon?: typeof BookOpen; primary?: boolean };

export function getRoleNavigation(signedIn: boolean, roles: RoleType[]): NavItem[] {
  if (!signedIn) return [
    { href: "/labs", label: "Labs", icon: BookOpen },
    { href: "/login", label: "Sign in" },
    { href: "/register", label: "How to join", primary: true },
  ];

  const student = roles.includes("STUDENT" as RoleType);
  const instructor = roles.includes("INSTRUCTOR" as RoleType);
  const admin = roles.includes("ADMIN" as RoleType);
  const items: NavItem[] = [];

  if (student) items.push(
    { href: "/dashboard", label: "Dashboard", icon: Gauge },
    { href: "/labs", label: "Labs", icon: BookOpen },
    { href: "/progress", label: "Progress", icon: Gauge },
    { href: "/achievements", label: "Achievements", icon: Award },
    { href: "/history", label: "History", icon: History },
    { href: "/doubts", label: "My doubts", icon: MessageCircleQuestion },
  );
  if (instructor) items.push(
    { href: "/instructor", label: "Instructor", icon: UsersRound },
    { href: "/instructor/doubts", label: "Student doubts", icon: MessageCircleQuestion },
  );
  if (admin) items.push(
    { href: "/admin", label: "Admin", icon: Settings },
    { href: "/system-health", label: "System health", icon: HeartPulse },
  );
  items.push(
    { href: "/support", label: "Support", icon: LifeBuoy },
    { href: "/profile", label: "Profile", icon: UserRound },
  );
  return items;
}

function NavigationLinks({ items, close }: { items: NavItem[]; close?: () => void }) {
  return <>{items.map(({ href, label, icon: Icon, primary }) => <Link key={href} href={href} onClick={close} className={`nav-link ${primary ? "nav-link-primary" : ""}`}>
    {Icon ? <Icon size={16} aria-hidden="true" /> : null}{label}
  </Link>)}</>;
}

export function SiteNavigation({ signedIn, roles }: Props) {
  const [open, setOpen] = useState(false);
  const items = getRoleNavigation(signedIn, roles);
  return <>
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
      <NavigationLinks items={items} />
      <ThemeToggle />
      {signedIn ? <LogoutButton /> : null}
    </nav>
    <div className="lg:hidden">
      <button type="button" className="button-secondary grid h-10 w-10 place-items-center p-0" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="mobile-primary-navigation" onClick={() => setOpen((value) => !value)}>
        {open ? <X size={20} /> : <Menu size={21} />}
      </button>
      {open ? <div id="mobile-primary-navigation" className="absolute inset-x-0 top-full border-b p-3 shadow-xl" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
        <nav className="shell grid gap-1" aria-label="Mobile primary navigation">
          <NavigationLinks items={items} close={() => setOpen(false)} />
          <div className="mt-2 flex items-center gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}><ThemeToggle />{signedIn ? <LogoutButton /> : null}</div>
        </nav>
      </div> : null}
    </div>
  </>;
}
