"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { adminApi, type LeakageReport } from "@/lib/admin/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/form/form-alert";
import { Skeleton } from "@/components/ui/skeleton";

type StatusFilter = "OPEN" | "REVIEWED" | "DISMISSED" | "ALL";

const filters: Array<{ value: StatusFilter; label: string }> = [
  { value: "OPEN", label: "Open" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "DISMISSED", label: "Dismissed" },
  { value: "ALL", label: "All" },
];

export default function AdminReportsPage() {
  const [filter, setFilter] = useState<StatusFilter>("OPEN");
  const [items, setItems] = useState<LeakageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    adminApi
      .reports(filter === "ALL" ? undefined : filter)
      .then(({ items: list }) => {
        if (!active) return;
        setItems(list);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof ApiError ? fetchError.message : "Reports could not be loaded. Try again.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filter]);

  const resolve = async (reportId: string, status: "REVIEWED" | "DISMISSED") => {
    setActingId(reportId);
    setError(null);

    try {
      await adminApi.resolveReport(reportId, status);
      setItems((current) =>
        filter === "ALL" || filter === "OPEN"
          ? current.filter((report) => report.reportId !== reportId)
          : current.map((report) => (report.reportId === reportId ? { ...report, status } : report)),
      );
      toast.success(status === "DISMISSED" ? "Report dismissed" : "Report marked reviewed");
    } catch (actionError) {
      setError(actionError instanceof ApiError ? actionError.message : "Report could not be updated. Try again.");
    } finally {
      setActingId(null);
    }
  };

  const handleFilterChange = (next: StatusFilter) => {
    if (next === filter) return;
    setError(null);
    setItems([]);
    setLoading(true);
    setFilter(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={filter === item.value ? "secondary" : "ghost"}
            onClick={() => handleFilterChange(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {error ? <FormAlert>{error}</FormAlert> : null}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((skeleton) => (
            <Skeleton key={skeleton} className="h-36 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">
            No reports here. Flagged messages appear automatically — nothing is ever blocked or accused without a human look.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((report) => (
            <li key={report.reportId} className="space-y-2 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {report.sourceType === "REQUEST_MESSAGE" ? "Request message" : "Review text"}{" "}
                  <span className="font-normal text-muted-foreground">· {report.createdAt.slice(0, 10)}</span>
                </p>
                <Badge variant={report.status === "OPEN" ? "destructive" : "outline"}>{report.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {report.findings.map((finding) => (
                  <Badge key={finding.type} variant="secondary">
                    {finding.type} × {finding.count}
                  </Badge>
                ))}
              </div>
              <p className="rounded-lg bg-muted/60 p-2.5 font-mono text-xs">{report.excerpt}</p>
              {report.status === "OPEN" ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" disabled={actingId === report.reportId} onClick={() => resolve(report.reportId, "REVIEWED")}>
                    Mark reviewed
                  </Button>
                  <Button size="sm" variant="ghost" disabled={actingId === report.reportId} onClick={() => resolve(report.reportId, "DISMISSED")}>
                    Dismiss
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
