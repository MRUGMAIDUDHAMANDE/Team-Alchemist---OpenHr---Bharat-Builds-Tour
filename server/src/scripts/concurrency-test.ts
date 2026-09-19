import "dotenv/config";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../aws/clients";
import { env } from "../config/env";
import { availabilityRepository } from "../modules/availability/availability.repository";
import { bookingsRepository } from "../modules/bookings/bookings.repository";
import { requestsRepository } from "../modules/requests/requests.repository";
import { buildDefaultProfile, usersRepository } from "../modules/users/users.repository";
import { requestsService } from "../modules/requests/requests.service";
import type { AvailabilitySlot } from "../modules/availability/availability.types";
import type { BookingRequest } from "../modules/requests/requests.types";

const PREFIX = `__concurrency_test_${Date.now()}__`;
const PUBLISHER_ID = `${PREFIX}_publisher`;
const ATTEMPTS = 10;

async function cleanup(userIds: string[], slotIds: string[], requestIds: string[], bookingIds: string[]): Promise<void> {
  const targets = [
    ...userIds.map((id) => ({ table: env.DYNAMODB_USERS_TABLE, key: { userId: id } })),
    ...slotIds.map((id) => ({ table: env.DYNAMODB_AVAILABILITY_TABLE, key: { availabilityId: id } })),
    ...requestIds.map((id) => ({ table: env.DYNAMODB_REQUESTS_TABLE, key: { requestId: id } })),
    ...bookingIds.map((id) => ({ table: env.DYNAMODB_BOOKINGS_TABLE, key: { bookingId: id } })),
  ];
  await Promise.all(
    targets.map((target) =>
      ddb.send(new DeleteCommand({ TableName: target.table, Key: target.key })).catch(() => undefined),
    ),
  );
}

async function main(): Promise<void> {
  const now = Date.now();
  const startTime = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  const endTime = new Date(now + 26 * 60 * 60 * 1000).toISOString();
  const timestamp = new Date().toISOString();
  const slotId = `${PREFIX}_slot`;

  await usersRepository.createIfAbsent(
    buildDefaultProfile({
      userId: PUBLISHER_ID,
      email: `${PREFIX}@example.com`,
      name: "Concurrency Test",
      status: "ACTIVE",
    }),
  );

  const slot: AvailabilitySlot = {
    availabilityId: slotId,
    publisherId: PUBLISHER_ID,
    publisherName: "Concurrency Test",
    publisherRatingAverage: 0,
    publisherRatingCount: 0,
    publisherCompletedBookings: 0,
    publisherVerificationStatus: "UNVERIFIED",
    skills: ["Testing"],
    startTime,
    endTime,
    location: "Pune",
    serviceRadiusKm: null,
    hourlyRate: 100,
    mode: "ONLINE",
    status: "AVAILABLE",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await availabilityRepository.create(slot);

  const requestIds = Array.from({ length: ATTEMPTS }, (_, index) => `${PREFIX}_req_${index}`);
  await Promise.all(
    requestIds.map((requestId, index) => {
      const request: BookingRequest = {
        requestId,
        availabilityId: slotId,
        publisherId: PUBLISHER_ID,
        seekerId: `${PREFIX}_seeker_${index}`,
        seekerName: `Seeker ${index}`,
        message: "Concurrency test request",
        skills: ["Testing"],
        startTime,
        endTime,
        location: "Pune",
        hourlyRate: 100,
        mode: "ONLINE",
        status: "PENDING",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return requestsRepository.create(request);
    }),
  );

  const results = await Promise.allSettled(
    requestIds.map((requestId) =>
      requestsService.acceptRequest(PUBLISHER_ID, requestId, requestsRepository, availabilityRepository, usersRepository),
    ),
  );

  const succeeded = results.filter((result) => result.status === "fulfilled");
  const failed = results.filter((result) => result.status === "rejected");
  const conflicted = failed.filter((result) => {
    const reason = result as PromiseRejectedResult;
    return reason.reason instanceof Error && reason.reason.message.length > 0;
  });

  const finalSlot = await availabilityRepository.getById(slotId);
  const bookings = await bookingsRepository.getByAvailabilityId(slotId);

  console.log("\n────────────────────────────────────────────");
  console.log(`Attempts:  ${ATTEMPTS}`);
  console.log(`Succeeded: ${succeeded.length}`);
  console.log(`Failed:    ${failed.length} (${conflicted.length} with conflict errors)`);
  console.log(`Slot:      ${finalSlot?.status}`);
  console.log(`Bookings:  ${bookings.length}`);
  console.log("────────────────────────────────────────────");

  await cleanup([PUBLISHER_ID], [slotId], requestIds, bookings.map((booking) => booking.bookingId));

  const passed =
    succeeded.length === 1 &&
    failed.length === ATTEMPTS - 1 &&
    finalSlot?.status === "BOOKED" &&
    bookings.length === 1;

  if (!passed) {
    console.error("\n[concurrency-test] FAIL: expected exactly 1 success and 1 booking");
    process.exit(1);
  }

  console.log("\n[concurrency-test] PASS: first successful atomic acceptance won\n");
}

main().catch((error) => {
  console.error("\n[concurrency-test] failed:", error);
  process.exit(1);
});
