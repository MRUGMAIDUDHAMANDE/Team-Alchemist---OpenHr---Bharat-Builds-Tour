import { AdminDisableUserCommand, AdminEnableUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { AppError } from "../../lib/errors";
import { cognitoClient } from "../../aws/clients";
import { env } from "../../config/env";
import { availabilityRepository } from "../availability/availability.repository";
import { bookingsRepository } from "../bookings/bookings.repository";
import { contactRepository } from "../contact/contact.repository";
import { settingsRepository } from "../settings/settings.repository";
import { reportsRepository } from "../reports/reports.repository";
import { usersRepository } from "../users/users.repository";
import type { ListReportsQuery, SetContactStatusInput, SetReportStatusInput, SetUserStatusInput } from "./admin.schemas";
import { adminService } from "./admin.service";

export const adminController = {
  overview: asyncHandler(async (_req: Request, res: Response) => {
    const overview = await adminService.getOverview(
      usersRepository,
      availabilityRepository,
      bookingsRepository,
      contactRepository,
      settingsRepository,
    );
    res.status(200).json({ data: overview });
  }),

  listUsers: asyncHandler(async (_req: Request, res: Response) => {
    const users = await adminService.listUsers(usersRepository);
    res.status(200).json({ data: { users } });
  }),

  setUserStatus: asyncHandler(async (req: Request, res: Response) => {
    const params = req.params as { userId: string };
    const input = req.body as SetUserStatusInput;
    const profile = await usersRepository.getById(params.userId);
    if (!profile) {
      throw AppError.notFound("User not found");
    }

    if (input.status === "DISABLED") {
      await cognitoClient.send(
        new AdminDisableUserCommand({ UserPoolId: env.COGNITO_USER_POOL_ID, Username: profile.email }),
      );
    }
    if (input.status === "ACTIVE") {
      await cognitoClient.send(
        new AdminEnableUserCommand({ UserPoolId: env.COGNITO_USER_POOL_ID, Username: profile.email }),
      ).catch(() => undefined);
    }

    await usersRepository.setStatus(params.userId, input.status);
    res.status(200).json({ data: { userId: params.userId, status: input.status } });
  }),

  listBookings: asyncHandler(async (_req: Request, res: Response) => {
    const bookings = await adminService.listBookings(bookingsRepository);
    res.status(200).json({ data: { bookings } });
  }),

  listContact: asyncHandler(async (_req: Request, res: Response) => {
    const messages = await adminService.listContact(contactRepository);
    res.status(200).json({ data: { messages } });
  }),

  resolveContact: asyncHandler(async (req: Request, res: Response) => {
    const params = req.params as { messageId: string };
    const input = req.body as SetContactStatusInput;
    const message = await adminService.resolveContact(params.messageId, input.status, contactRepository);
    res.status(200).json({ data: { message } });
  }),

  listReports: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListReportsQuery;
    const page = await adminService.listReports(query.status, query.limit, query.cursor, reportsRepository);
    res.status(200).json({ data: page });
  }),

  resolveReport: asyncHandler(async (req: Request, res: Response) => {
    const params = req.params as { reportId: string };
    const input = req.body as SetReportStatusInput;
    const report = await adminService.resolveReport(params.reportId, input.status, reportsRepository);
    res.status(200).json({ data: { report } });
  }),
};
