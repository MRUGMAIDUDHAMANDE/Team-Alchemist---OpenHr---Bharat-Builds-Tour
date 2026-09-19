"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { adminApi, type AdminUser } from "@/lib/admin/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/form/form-alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    adminApi
      .users()
      .then(({ users: list }) => {
        if (active) {
          setUsers(list);
          setLoading(false);
        }
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof ApiError ? fetchError.message : "Users could not be loaded. Try again.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const changeStatus = async (userId: string, status: "ACTIVE" | "SUSPENDED" | "DISABLED") => {
    setActingId(userId);
    setError(null);

    try {
      await adminApi.setUserStatus(userId, status);
      setUsers((current) => current.map((user) => (user.userId === userId ? { ...user, status } : user)));
      toast.success(status === "ACTIVE" ? "User reactivated" : `User ${status.toLowerCase()}`);
    } catch (actionError) {
      setError(actionError instanceof ApiError ? actionError.message : "Status could not be changed. Try again.");
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((skeleton) => (
          <Skeleton key={skeleton} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <FormAlert>{error}</FormAlert> : null}
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.userId}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === "ACTIVE" ? "secondary" : "destructive"}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.createdAt.slice(0, 10)}</TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex gap-1.5">
                    {user.status !== "ACTIVE" ? (
                      <Button size="sm" variant="outline" disabled={actingId === user.userId} onClick={() => changeStatus(user.userId, "ACTIVE")}>
                        Reactivate
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" disabled={actingId === user.userId} onClick={() => changeStatus(user.userId, "SUSPENDED")}>
                          Suspend
                        </Button>
                        <Button size="sm" variant="ghost" disabled={actingId === user.userId} onClick={() => changeStatus(user.userId, "DISABLED")}>
                          Disable
                        </Button>
                      </>
                    )}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
