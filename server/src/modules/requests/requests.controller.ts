import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { AppError } from "../../lib/errors";
import { availabilityRepository } from "../availability/availability.repository";
import { usersRepository } from "../users/users.repository";
import { emitNotification } from "../notifications/events";
import { requestsRepository } from "./requests.repository";
import type { CreateRequestInput, ListRequestsQuery } from "./requests.schemas";
import { requestsService } from "./requests.service";

function authenticatedUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw AppError.unauthorized();
  }
  return userId;
}

export const requestsController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const request = await requestsService.createRequest(
      authenticatedUserId(req),
      req.body as CreateRequestInput,
      requestsRepository,
      availabilityRepository,
      usersRepository,
    );
    await emitNotification({
      userId: request.publisherId,
      type: "REQUEST_CREATED",
      title: "New booking request",
      body: `${request.seekerName} requested ${request.skills[0] ?? "a slot"} in ${request.location}.`,
      link: "/requests",
    });
    res.status(201).json({ data: { request } });
  }),

  listMine: asyncHandler(async (req: Request, res: Response) => {
    const page = await requestsService.listMine(
      authenticatedUserId(req),
      req.query as unknown as ListRequestsQuery,
      requestsRepository,
    );
    res.status(200).json({ data: page });
  }),

  accept: asyncHandler(async (req: Request, res: Response) => {
    const params = req.params as { requestId: string };
    const result = await requestsService.acceptRequest(
      authenticatedUserId(req),
      params.requestId,
      requestsRepository,
      availabilityRepository,
      usersRepository,
    );
    await emitNotification({
      userId: result.request.seekerId,
      type: "REQUEST_ACCEPTED",
      title: "Request accepted",
      body: `${result.booking.publisherName} confirmed your booking.`,
      link: "/bookings",
    });
    res.status(200).json({ data: result });
  }),

  reject: asyncHandler(async (req: Request, res: Response) => {
    const params = req.params as { requestId: string };
    const request = await requestsService.rejectRequest(authenticatedUserId(req), params.requestId, requestsRepository);
    await emitNotification({
      userId: request.seekerId,
      type: "REQUEST_REJECTED",
      title: "Request declined",
      body: "The publisher declined your request. Try another available slot.",
      link: "/explore",
    });
    res.status(200).json({ data: { request } });
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const params = req.params as { requestId: string };
    const request = await requestsService.cancelRequest(authenticatedUserId(req), params.requestId, requestsRepository);
    await emitNotification({
      userId: request.publisherId,
      type: "REQUEST_CANCELLED",
      title: "Request cancelled",
      body: `${request.seekerName} cancelled their request.`,
      link: "/requests",
    });
    res.status(200).json({ data: { request } });
  }),
};
