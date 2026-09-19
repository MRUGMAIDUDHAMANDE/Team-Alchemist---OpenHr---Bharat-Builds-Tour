"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { notificationsApi, type NotificationItem } from "@/lib/notifications/api";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/form/form-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    notificationsApi
      .listMine({})
      .then((page) => {
        if (!active) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof ApiError ? fetchError.message : "Notifications could not be loaded. Try again.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const openItem = async (item: NotificationItem) => {
    if (!item.read) {
      try {
        await notificationsApi.markRead(item.notificationId);
        setItems((current) =>
          current.map((entry) =>
            entry.notificationId === item.notificationId ? { ...entry, read: true } : entry,
          ),
        );
      } catch {
        // Best-effort; navigation still proceeds.
      }
    }
    router.push(item.link ?? "/dashboard");
  };

  const handleMarkAllRead = async () => {
    setError(null);
    try {
      await notificationsApi.markAllRead();
      setItems((current) => current.map((entry) => ({ ...entry, read: true })));
    } catch (markError) {
      setError(markError instanceof ApiError ? markError.message : "Could not mark notifications read. Try again.");
    }
  };

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);

    try {
      const page = await notificationsApi.listMine({ cursor });
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch (fetchError) {
      setError(fetchError instanceof ApiError ? fetchError.message : "More notifications could not be loaded. Try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">Requests, bookings, and review updates.</p>
        </div>
        {!loading && items.some((item) => !item.read) ? (
          <Button size="sm" variant="outline" onClick={handleMarkAllRead}>
            Mark all read
          </Button>
        ) : null}
      </div>

      {error ? <FormAlert>{error}</FormAlert> : null}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((skeleton) => (
            <Skeleton key={skeleton} className="h-20 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="space-y-3 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <h2 className="font-heading text-base font-semibold">No notifications yet</h2>
          <p className="text-sm text-muted-foreground">
            Publish availability or send a request — updates appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.notificationId}>
              <button
                type="button"
                onClick={() => openItem(item)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl bg-card p-4 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  !item.read && "bg-accent/40",
                )}
              >
                {!item.read ? <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.createdAt.slice(0, 10)}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{item.body}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {cursor && !loading ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading more" : "Load more"}
          </Button>
        </div>
      ) : null}

    </div>
  );
}
