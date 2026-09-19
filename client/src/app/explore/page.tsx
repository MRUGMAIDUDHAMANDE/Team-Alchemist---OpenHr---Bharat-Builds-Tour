"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { AvailabilityMode } from "@/lib/auth/types";
import { availabilityApi, type SearchAvailabilityFilter } from "@/lib/availability/api";
import { combineLocalDateTime } from "@/lib/availability/form";
import { formatSlotWindow } from "@/lib/availability/format";
import type { AvailabilitySlot } from "@/lib/availability/types";
import { AvailabilityCard } from "@/components/availability-card";
import { RequestDialog } from "@/components/marketplace/request-dialog";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/form/form-alert";
import { ModeField } from "@/components/form/mode-field";
import { TextField } from "@/components/form/text-field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const ratingOptions = [
  { value: "", label: "Any rating" },
  { value: "3", label: "3 stars and up" },
  { value: "4", label: "4 stars and up" },
  { value: "4.5", label: "4.5 stars and up" },
];

export default function ExplorePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [mode, setMode] = useState<AvailabilityMode>("ANY");
  const [minRating, setMinRating] = useState("");
  const [items, setItems] = useState<AvailabilitySlot[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestSlot, setRequestSlot] = useState<AvailabilitySlot | null>(null);

  useEffect(() => {
    let active = true;

    availabilityApi
      .search({ limit: 20 })
      .then((page) => {
        if (!active) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof ApiError ? fetchError.message : "Availability could not be loaded. Try again.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleItems = user ? items.filter((slot) => slot.publisherId !== user.userId) : items;

  const handleRequest = (slot: AvailabilitySlot) => {
    if (!isAuthenticated) {
      router.push("/login?next=/explore");
      return;
    }
    setRequestSlot(slot);
  };

  const buildFilter = (): SearchAvailabilityFilter | null => {
    const filter: SearchAvailabilityFilter = { limit: 20 };
    if (skills.trim()) filter.skills = skills.trim();
    if (location.trim()) filter.location = location.trim();
    if (mode !== "ANY") filter.mode = mode;

    if (date && (startTime || endTime)) {
      if (startTime && endTime) {
        const start = combineLocalDateTime(date, startTime);
        const end = combineLocalDateTime(date, endTime);
        if (!start || !end || end.getTime() <= start.getTime()) {
          setError("End time must be after start time.");
          return null;
        }
        filter.from = start.toISOString();
        filter.to = end.toISOString();
      } else if (startTime) {
        const start = combineLocalDateTime(date, startTime);
        if (!start) {
          setError("Use a valid date and start time.");
          return null;
        }
        filter.from = start.toISOString();
      } else if (endTime) {
        const end = combineLocalDateTime(date, endTime);
        if (!end) {
          setError("Use a valid date and end time.");
          return null;
        }
        filter.to = end.toISOString();
      }
    }

    if (maxRate.trim()) {
      const rate = Number(maxRate);
      if (!Number.isInteger(rate) || rate <= 0) {
        setError("Maximum rate must be a whole number greater than zero.");
        return null;
      }
      filter.maxHourlyRate = rate;
    }

    if (minRating) filter.minRating = Number(minRating);
    return filter;
  };

  const handleSearch = async () => {
    setError(null);
    const filter = buildFilter();
    if (!filter) return;
    setLoading(true);
    setItems([]);
    setCursor(null);

    try {
      const page = await availabilityApi.search(filter);
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch (fetchError) {
      setError(fetchError instanceof ApiError ? fetchError.message : "Search could not run. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setSkills("");
    setLocation("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setMaxRate("");
    setMode("ANY");
    setMinRating("");
    setError(null);
    setLoading(true);
    setItems([]);
    setCursor(null);

    try {
      const page = await availabilityApi.search({ limit: 20 });
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch (fetchError) {
      setError(fetchError instanceof ApiError ? fetchError.message : "Availability could not be loaded. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);

    try {
      const filter = buildFilter();
      if (!filter) return;
      const page = await availabilityApi.search({ ...filter, cursor });
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch (fetchError) {
      setError(fetchError instanceof ApiError ? fetchError.message : "More results could not be loaded. Try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader
        links={[
          { href: "/", label: "Home" },
          { href: "/explore", label: "Explore" },
          { href: "/#modes", label: "How it works" },
        ]}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-10">
        <div className="max-w-2xl space-y-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Explore availability</h1>
          <p className="text-sm text-muted-foreground">
            Search people who are free when you need them. Results show soonest available slots first.
          </p>
        </div>

        <section className="space-y-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextField
              label="Skills"
              placeholder="React, Python"
              hint="Separate skills with commas."
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
            />
            <TextField
              label="Location"
              placeholder="Pune"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <TextField
              label="From"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
            <TextField
              label="To"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
            <TextField
              label="Max rate (₹/hour)"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="800"
              value={maxRate}
              onChange={(event) => setMaxRate(event.target.value)}
            />
            <ModeField id="explore-mode" label="Mode" value={mode} onChange={setMode} />
            <div className="space-y-1.5">
              <Label htmlFor="explore-rating">Rating</Label>
              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger id="explore-rating" className="h-9 w-full">
                  <SelectValue placeholder="Any rating" />
                </SelectTrigger>
                <SelectContent>
                  {ratingOptions.map((option) => (
                    <SelectItem key={option.label} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleSearch} disabled={loading}>
              Search
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClear} disabled={loading}>
              Clear filters
            </Button>
          </div>
        </section>

        {error ? <FormAlert>{error}</FormAlert> : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((skeleton) => (
              <Skeleton key={skeleton} className="h-64 w-full" />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="space-y-3 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <h2 className="font-heading text-base font-semibold">No availability matches those filters</h2>
            <p className="text-sm text-muted-foreground">
              Widen the time window, raise the maximum rate, or clear filters to see more slots.
            </p>
            <Button size="sm" variant="outline" onClick={handleClear}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((slot) => (
              <AvailabilityCard
                key={slot.availabilityId}
                name={slot.publisherName}
                headline={slot.skills[0] ?? "Availability"}
                location={slot.location}
                mode={slot.mode}
                hourlyRate={slot.hourlyRate}
                window={formatSlotWindow(slot.startTime, slot.endTime)}
                skills={slot.skills}
                status={slot.status}
                footer={
                  <>
                    <Button size="sm" asChild>
                      <Link href={`/u/${slot.publisherId}`}>View profile</Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRequest(slot)}>
                      Request slot
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        )}

        <RequestDialog slot={requestSlot} onClose={() => setRequestSlot(null)} onSent={() => router.push("/requests")} />

        {cursor && !loading ? (
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? "Loading more" : "Load more"}
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
