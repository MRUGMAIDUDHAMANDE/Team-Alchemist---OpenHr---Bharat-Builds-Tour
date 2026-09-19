import type { ReactNode } from "react";
import { ClockIcon, MapPinIcon, WifiIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AuthUser } from "@/lib/auth/types";
import type { PublicUserProfile } from "@/lib/users/types";
import { RatingDisplay } from "./rating-display";

interface ProfileCardProps {
  profile: PublicUserProfile | AuthUser;
  action?: ReactNode;
}

const modeLabels = {
  ONLINE: "Online",
  IN_PERSON: "In person",
  ANY: "Online or in person",
} as const;

export function ProfileCard({ profile, action }: ProfileCardProps) {
  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {initials}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-base font-semibold">{profile.name}</h2>
              <Badge variant="secondary">{profile.verificationStatus === "VERIFIED" ? "Verified" : "Unverified"}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPinIcon className="size-3.5" />
                {profile.location ?? "Location not set"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <WifiIcon className="size-3.5" />
                {modeLabels[profile.preferredMode]}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="size-3.5" />
                {profile.hourlyRate ? `₹${profile.hourlyRate.toLocaleString("en-IN")}/hour` : "Rate not set"}
              </span>
            </div>
            <div className="mt-2">
              <RatingDisplay value={profile.ratingAverage} count={profile.ratingCount} />
            </div>
          </div>
        </div>
        {action}
      </div>

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <h3 className="text-xs font-medium text-muted-foreground">Bio</h3>
          <p className="mt-1 text-foreground">{profile.bio ?? "No bio added yet."}</p>
        </div>

        <div>
          <h3 className="text-xs font-medium text-muted-foreground">Skills</h3>
          {profile.skills.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-muted-foreground">No skills added yet.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-medium text-muted-foreground">Experience</h3>
            <p className="mt-1 text-foreground">{profile.experience ?? "No experience added yet."}</p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground">Languages</h3>
            <p className="mt-1 text-foreground">
              {profile.languages.length > 0 ? profile.languages.join(", ") : "No languages added yet."}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Completed bookings: {profile.completedBookings} · Member since {profile.createdAt.slice(0, 10)}
        </p>
      </div>
    </section>
  );
}
