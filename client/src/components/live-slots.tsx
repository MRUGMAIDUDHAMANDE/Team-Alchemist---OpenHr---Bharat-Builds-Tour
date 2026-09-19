"use client";

import { useEffect, useState } from "react";
import { availabilityApi } from "@/lib/availability/api";
import { formatSlotWindow } from "@/lib/availability/format";
import type { AvailabilitySlot } from "@/lib/availability/types";
import { AvailabilityCard } from "@/components/availability-card";
import { Skeleton } from "@/components/ui/skeleton";

const fallbackSlots = [
  {
    name: "Rahul Sharma",
    headline: "Python developer",
    location: "Pune",
    mode: "ONLINE" as const,
    hourlyRate: 700,
    window: "Today, 4:00 PM – 6:00 PM",
    skills: ["Python", "APIs", "Debugging"],
  },
  {
    name: "Aisha Khan",
    headline: "Maths tutor",
    location: "Bengaluru",
    mode: "IN_PERSON" as const,
    hourlyRate: 550,
    window: "Today, 6:30 PM – 8:00 PM",
    skills: ["Algebra", "Calculus"],
  },
  {
    name: "Vikram Rao",
    headline: "Product designer",
    location: "Hyderabad",
    mode: "ONLINE" as const,
    hourlyRate: 900,
    window: "Tomorrow, 10:00 AM – 1:00 PM",
    skills: ["Figma", "Design systems"],
  },
];

function toCard(slot: AvailabilitySlot) {
  return {
    name: slot.publisherName,
    headline: slot.skills[0] ?? "Availability",
    location: slot.location,
    mode: slot.mode,
    hourlyRate: slot.hourlyRate,
    window: formatSlotWindow(slot.startTime, slot.endTime),
    skills: slot.skills,
  };
}

export function LiveSlots() {
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null);

  useEffect(() => {
    let active = true;

    availabilityApi
      .search({ limit: 3 })
      .then((page) => {
        if (active) setSlots(page.items);
      })
      .catch(() => {
        if (active) setSlots([]);
      });

    return () => {
      active = false;
    };
  }, []);

  if (slots === null) {
    return (
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((skeleton) => (
          <Skeleton key={skeleton} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  const cards = slots.length > 0 ? slots.map(toCard) : fallbackSlots;

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((slot) => (
        <AvailabilityCard key={slot.name + slot.window} {...slot} />
      ))}
    </div>
  );
}
