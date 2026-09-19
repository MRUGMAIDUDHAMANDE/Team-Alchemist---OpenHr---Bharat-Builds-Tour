"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { adminApi, type ContactMessage } from "@/lib/admin/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/form/form-alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminContactPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    adminApi
      .contact()
      .then(({ messages: list }) => {
        if (!active) return;
        setMessages(list);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof ApiError ? fetchError.message : "Messages could not be loaded. Try again.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const changeStatus = async (messageId: string, status: "NEW" | "IN_REVIEW" | "RESOLVED") => {
    setActingId(messageId);
    setError(null);

    try {
      await adminApi.resolveContact(messageId, status);
      setMessages((current) =>
        current.map((message) => (message.messageId === messageId ? { ...message, status } : message)),
      );
      toast.success(status === "RESOLVED" ? "Message resolved" : "Message marked in review");
    } catch (actionError) {
      setError(actionError instanceof ApiError ? actionError.message : "Status could not be changed. Try again.");
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((skeleton) => (
          <Skeleton key={skeleton} className="h-36 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <FormAlert>{error}</FormAlert> : null}
      {messages.length === 0 ? (
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">No contact messages yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li key={message.messageId} className="space-y-2 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {message.name} <span className="font-normal text-muted-foreground">· {message.email}</span>
                </p>
                <Badge variant={message.status === "NEW" ? "secondary" : "outline"}>{message.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {message.category} · {message.createdAt.slice(0, 10)}
              </p>
              <p className="text-sm">{message.message}</p>
              {message.status !== "RESOLVED" ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {message.status === "NEW" ? (
                    <Button size="sm" variant="outline" disabled={actingId === message.messageId} onClick={() => changeStatus(message.messageId, "IN_REVIEW")}>
                      Mark in review
                    </Button>
                  ) : null}
                  <Button size="sm" disabled={actingId === message.messageId} onClick={() => changeStatus(message.messageId, "RESOLVED")}>
                    Resolve
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
