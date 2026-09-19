"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BellIcon } from "lucide-react";
import { notificationsApi, type NotificationItem } from "@/lib/notifications/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationBell() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [hasMoreUnread, setHasMoreUnread] = useState(false);
  const [recent, setRecent] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [{ count, hasMore }, page] = await Promise.all([
        notificationsApi.unreadCount(),
        notificationsApi.listMine({}),
      ]);
      setUnread(count);
      setHasMoreUnread(hasMore);
      setRecent(page.items);
    } catch {
      // The bell is ambient UI; failures stay silent and retry on next open.
    }
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([notificationsApi.unreadCount(), notificationsApi.listMine({})])
      .then(([{ count, hasMore }, page]) => {
        if (!active) return;
        setUnread(count);
        setHasMoreUnread(hasMore);
        setRecent(page.items);
      })
      .catch(() => {
        // Ambient UI; the next poll or open retries.
      });

    const timer = setInterval(() => void refresh(), 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [refresh]);

  const openItem = async (item: NotificationItem) => {
    setOpen(false);
    if (!item.read) {
      try {
        await notificationsApi.markRead(item.notificationId);
      } catch {
        // Reading state is best-effort; navigation still proceeds.
      }
      void refresh();
    }
    router.push(item.link ?? "/notifications");
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void refresh();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}>
          <span className="relative">
            <BellIcon className="size-4" />
            {unread > 0 ? (
              <span className="absolute -top-1.5 -right-2 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                {hasMoreUnread ? "99+" : unread > 99 ? 99 : unread}
              </span>
            ) : null}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="font-normal">
          <span className="text-sm font-medium">Notifications</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {recent.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            Nothing yet. Requests and booking updates appear here.
          </p>
        ) : (
          recent.slice(0, 6).map((item) => (
            <DropdownMenuItem
              key={item.notificationId}
              onSelect={() => openItem(item)}
              className="flex-col items-start gap-0.5 py-2"
            >
              <span className="flex w-full items-center gap-2 text-sm font-medium">
                {!item.read ? <span className="size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                <span className="truncate">{item.title}</span>
              </span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{item.body}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="justify-center text-sm">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
