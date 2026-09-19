"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { AvailabilityMode } from "@/lib/auth/types";
import { availabilityApi, type InterpretedFilter, type SearchAvailabilityFilter } from "@/lib/availability/api";
import { combineLocalDateTime, toLocalDate, toLocalTime } from "@/lib/availability/form";
import { formatSlotWindow } from "@/lib/availability/format";
import type { AvailabilitySlot } from "@/lib/availability/types";
import { AvailabilityCard } from "@/components/availability-card";
import { RequestDialog } from "@/components/marketplace/request-dialog";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

type SortKey = "soonest" | "rate" | "rating";

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "soonest", label: "Soonest first" },
  { value: "rate", label: "Lowest rate" },
  { value: "rating", label: "Highest rated" },
];

function validMode(value: string | null): AvailabilityMode {
  return value === "ONLINE" || value === "IN_PERSON" || value === "ANY" ? value : "ANY";
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-10">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-72 w-full" />
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [skills, setSkills] = useState(searchParams.get("skills") ?? "");
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [date, setDate] = useState(searchParams.get("date") ?? "");
  const [startTime, setStartTime] = useState(searchParams.get("from") ?? "");
  const [endTime, setEndTime] = useState(searchParams.get("to") ?? "");
  const [maxRate, setMaxRate] = useState(searchParams.get("maxRate") ?? "");
  const [mode, setMode] = useState<AvailabilityMode>(validMode(searchParams.get("mode")));
  const [minRating, setMinRating] = useState(searchParams.get("minRating") ?? "");
  const [sort, setSort] = useState<SortKey>("soonest");
  const [items, setItems] = useState<AvailabilitySlot[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestSlot, setRequestSlot] = useState<AvailabilitySlot | null>(null);
  const [nlQuery, setNlQuery] = useState("");
  const [interpreting, setInterpreting] = useState(false);

  useEffect(() => {
    let active = true;

    availabilityApi
      .search(paramsFromUrl(searchParams))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleItems = useMemo(() => {
    const mineExcluded = user ? items.filter((slot) => slot.publisherId !== user.userId) : items;
    const sorted = [...mineExcluded];
    if (sort === "rate") sorted.sort((a, b) => a.hourlyRate - b.hourlyRate);
    if (sort === "rating") sorted.sort((a, b) => b.publisherRatingAverage - a.publisherRatingAverage);
    return sorted;
  }, [items, user, sort]);

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

  const syncUrl = () => {
    const params = new URLSearchParams();
    if (skills.trim()) params.set("skills", skills.trim());
    if (location.trim()) params.set("location", location.trim());
    if (date) params.set("date", date);
    if (startTime) params.set("from", startTime);
    if (endTime) params.set("to", endTime);
    if (maxRate.trim()) params.set("maxRate", maxRate.trim());
    if (mode !== "ANY") params.set("mode", mode);
    if (minRating) params.set("minRating", minRating);
    const query = params.toString();
    router.replace(query ? `/explore?${query}` : "/explore", { scroll: false });
  };

  const applyInterpretedFilter = (filter: InterpretedFilter) => {
    setSkills(filter.skills?.join(", ") ?? "");
    setLocation(filter.location ?? "");
    setMaxRate(filter.maxHourlyRate !== undefined ? String(filter.maxHourlyRate) : "");
    setMode(filter.mode ?? "ANY");
    setMinRating("");
    if (filter.from) {
      const from = new Date(filter.from);
      setDate(toLocalDate(from));
      setStartTime(toLocalTime(from));
    } else {
      setDate("");
      setStartTime("");
    }
    if (filter.to) {
      const to = new Date(filter.to);
      if (!filter.from) setDate(toLocalDate(to));
      setEndTime(toLocalTime(to));
    } else {
      setEndTime("");
    }
  };

  const handleInterpret = async () => {
    if (nlQuery.trim().length < 3 || interpreting) return;
    setInterpreting(true);
    setError(null);

    try {
      const { filter } = await availabilityApi.interpret(nlQuery.trim());
      applyInterpretedFilter(filter);
      const page = await availabilityApi.search({
        skills: filter.skills?.join(", "),
        location: filter.location,
        mode: filter.mode,
        from: filter.from,
        to: filter.to,
        maxHourlyRate: filter.maxHourlyRate,
        limit: 20,
      });
      syncUrlFromFilter(filter);
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch (interpretError) {
      setError(interpretError instanceof ApiError ? interpretError.message : "Could not understand that request. Try the filters instead.");
    } finally {
      setInterpreting(false);
    }
  };

  const syncUrlFromFilter = (filter: InterpretedFilter) => {
    const params = new URLSearchParams();
    if (filter.skills?.length) params.set("skills", filter.skills.join(", "));
    if (filter.location) params.set("location", filter.location);
    if (filter.maxHourlyRate !== undefined) params.set("maxRate", String(filter.maxHourlyRate));
    if (filter.mode && filter.mode !== "ANY") params.set("mode", filter.mode);
    if (filter.from) {
      const from = new Date(filter.from);
      params.set("date", toLocalDate(from));
      params.set("from", toLocalTime(from));
    }
    if (filter.to) params.set("to", toLocalTime(new Date(filter.to)));
    const query = params.toString();
    router.replace(query ? `/explore?${query}` : "/explore", { scroll: false });
  };

  const handleSearch = async () => {
    setError(null);
    const filter = buildFilter();
    if (!filter) return;
    syncUrl();
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
    router.replace("/explore", { scroll: false });

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

        <section className="space-y-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <div className="space-y-1.5">
            <Label htmlFor="explore-nl">Describe what you need</Label>
            <Textarea
              id="explore-nl"
              rows={2}
              placeholder="I need someone in Pune today from 4 to 6 PM who can fix my React app under ₹800 per hour."
              value={nlQuery}
              onChange={(event) => setNlQuery(event.target.value)}
              disabled={interpreting || loading}
            />
            <p className="text-xs text-muted-foreground">
              AI fills the filters below from your description. Booking decisions always stay with you.
            </p>
          </div>
          <div>
            <Button size="sm" onClick={handleInterpret} disabled={interpreting || loading || nlQuery.trim().length < 3}>
              {interpreting ? "Understanding…" : "Understand and search"}
            </Button>
          </div>
        </section>

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
            <div className="space-y-1.5">
              <Label htmlFor="explore-sort">Sort by</Label>
              <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                <SelectTrigger id="explore-sort" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
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

        {!loading && !error ? (
          <p className="text-sm text-muted-foreground" role="status">
            {visibleItems.length === 0
              ? "No slots found."
              : `Showing ${visibleItems.length} available slot${visibleItems.length === 1 ? "" : "s"}.`}
          </p>
        ) : null}

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

        {cursor && !loading ? (
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? "Loading more" : "Load more"}
            </Button>
          </div>
        ) : null}

        <RequestDialog slot={requestSlot} onClose={() => setRequestSlot(null)} onSent={() => router.push("/requests")} />
      </main>
    </div>
  );
}

function paramsFromUrl(searchParams: URLSearchParams): SearchAvailabilityFilter {
  const filter: SearchAvailabilityFilter = { limit: 20 };
  const skills = searchParams.get("skills");
  const location = searchParams.get("location");
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const maxRate = searchParams.get("maxRate");
  const mode = searchParams.get("mode");
  const minRating = searchParams.get("minRating");

  if (skills) filter.skills = skills;
  if (location) filter.location = location;
  if (mode === "ONLINE" || mode === "IN_PERSON") filter.mode = mode;
  if (date && from) {
    const start = combineLocalDateTime(date, from);
    if (start) filter.from = start.toISOString();
  }
  if (date && to) {
    const end = combineLocalDateTime(date, to);
    if (end) filter.to = end.toISOString();
  }
  if (maxRate && Number.isInteger(Number(maxRate))) filter.maxHourlyRate = Number(maxRate);
  if (minRating && !Number.isNaN(Number(minRating))) filter.minRating = Number(minRating);
  return filter;
}
