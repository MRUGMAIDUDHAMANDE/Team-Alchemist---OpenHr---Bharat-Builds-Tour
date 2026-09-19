import Link from "next/link";
import { ArrowRightIcon, CalendarCheckIcon, SearchIcon, ShieldCheckIcon } from "lucide-react";
import { AvailabilityCard } from "@/components/availability-card";
import { LiveSlots } from "@/components/live-slots";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const sampleAvailability = [
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

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader
        links={[
          { href: "/explore", label: "Explore" },
          { href: "#modes", label: "How it works" },
          { href: "#trust", label: "Trust" },
        ]}
      />

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="space-y-6">
            <h1 className="font-heading text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
              Your time is valuable. Make it available.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground">
              OpenHR is an availability-first marketplace. Publish the hours you are free and the
              skills you offer, or find someone who is available exactly when you need them.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/explore">
                  Find someone
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/signup">List your availability</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              One account works for both finding help and offering your time.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Example availability</span>
              <Badge variant="secondary">Live slots</Badge>
            </div>
            <AvailabilityCard {...sampleAvailability[0]} />
            <AvailabilityCard {...sampleAvailability[1]} />
          </div>
        </section>

        <section id="available" className="border-t bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="font-heading text-2xl font-semibold tracking-tight">
                  People available right now
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Live slots published on OpenHR. Slots update as people become free or get booked.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/explore">Explore all</Link>
              </Button>
            </div>
            <LiveSlots />
          </div>
        </section>

        <section id="modes" className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-3">
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                Two ways to use one account
              </h2>
              <p className="text-sm text-muted-foreground">
                Search for the help you need, and offer your own time when you are free. Switch
                between both without creating a second profile.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
                <SearchIcon className="size-5 text-primary" />
                <h3 className="text-sm font-medium">Find help</h3>
                <p className="text-sm text-muted-foreground">
                  Filter by skill, distance, time window, rate and online or in-person mode.
                </p>
              </div>
              <div className="space-y-2 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
                <CalendarCheckIcon className="size-5 text-primary" />
                <h3 className="text-sm font-medium">Publish availability</h3>
                <p className="text-sm text-muted-foreground">
                  Post a slot with your skills and rate. Only one booking can win a contested slot.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="trust" className="border-t bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <div className="flex items-start gap-4">
              <ShieldCheckIcon className="mt-0.5 size-5 text-primary" />
              <div>
                <h2 className="font-heading text-lg font-semibold tracking-tight">
                  Built for trust and single-winner booking
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Authentication is handled by Amazon Cognito. Availability and bookings are
                  protected by conditional writes so a slot can never be double-booked, and private
                  media stays in a private S3 bucket.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <span>OpenHR</span>
          <nav className="flex items-center gap-6">
            <Link href="/contact" className="transition-colors hover:text-foreground">
              Contact
            </Link>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
            <Link href="/signup" className="transition-colors hover:text-foreground">
              Create account
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
