"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  CalendarCheckIcon,
  CalendarRangeIcon,
  InboxIcon,
  LayoutDashboardIcon,
  SearchIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
}

const primaryNav: NavItem[] = [
  { href: "/explore", label: "Explore", icon: SearchIcon },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/profile", label: "Profile", icon: UserRoundIcon },
  { href: "/availability", label: "My availability", icon: CalendarRangeIcon },
  { href: "/requests", label: "Requests", icon: InboxIcon },
  { href: "/bookings", label: "Bookings", icon: CalendarCheckIcon },
];

const upcomingNav: NavItem[] = [
  { label: "Notifications", icon: BellIcon },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground">
          <span className="text-xs font-bold">O</span>
        </span>
        <span className="font-semibold">OpenHR</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {primaryNav.map((item) => {
          const active = item.href ? isActive(pathname, item.href) : false;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href ?? "#"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}

        <p className="mt-4 px-2.5 text-xs text-muted-foreground">Coming next</p>
        {upcomingNav.map((item) => {
          const Icon = item.icon;
          return (
            <span
              key={item.label}
              aria-disabled="true"
              title="Available in a later milestone"
              className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground/60"
            >
              <Icon className="size-4" />
              {item.label}
            </span>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b bg-sidebar px-2 py-1.5 md:hidden">
      {primaryNav.map((item) => {
        const active = item.href ? isActive(pathname, item.href) : false;
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href ?? "#"}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors",
              active ? "bg-sidebar-accent font-medium" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
      <span className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap text-muted-foreground/60">
        <SearchIcon className="size-4" />
        Explore
      </span>
    </nav>
  );
}
