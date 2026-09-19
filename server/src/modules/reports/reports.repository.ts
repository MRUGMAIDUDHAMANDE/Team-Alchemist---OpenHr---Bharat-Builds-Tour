import { GetCommand, PutCommand, QueryCommand, UpdateCommand, type QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../../aws/clients";
import { env } from "../../config/env";
import type { LeakageReport, ReportStatus } from "./reports.types";

export const REPORT_STATUS_INDEX = "status-index";

export interface ReportListResult {
  items: LeakageReport[];
  lastKey?: Record<string, unknown>;
}

export const reportsRepository = {
  async create(report: LeakageReport): Promise<LeakageReport> {
    await ddb.send(
      new PutCommand({
        TableName: env.DYNAMODB_REPORTS_TABLE,
        Item: report,
        ConditionExpression: "attribute_not_exists(reportId)",
      }),
    );
    return report;
  },

  async getById(reportId: string): Promise<LeakageReport | null> {
    const result = await ddb.send(
      new GetCommand({
        TableName: env.DYNAMODB_REPORTS_TABLE,
        Key: { reportId },
      }),
    );
    return (result.Item as LeakageReport | undefined) ?? null;
  },

  async listByStatus(status: ReportStatus | undefined, limit: number, exclusiveStartKey?: Record<string, unknown>): Promise<ReportListResult> {
    if (!status) {
      const open = await reportsRepository.listByStatus("OPEN", limit, undefined);
      const reviewed = await reportsRepository.listByStatus("REVIEWED", limit, undefined);
      const items = [...open.items, ...reviewed.items].slice(0, limit);
      return { items };
    }

    const result = await ddb.send(
      new QueryCommand({
        TableName: env.DYNAMODB_REPORTS_TABLE,
        IndexName: REPORT_STATUS_INDEX,
        KeyConditionExpression: "#status = :status",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": status },
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey as QueryCommandInput["ExclusiveStartKey"],
      }),
    );
    return {
      items: (result.Items as LeakageReport[] | undefined) ?? [],
      lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
    };
  },

  async setStatus(reportId: string, status: ReportStatus): Promise<LeakageReport> {
    const result = await ddb.send(
      new UpdateCommand({
        TableName: env.DYNAMODB_REPORTS_TABLE,
        Key: { reportId },
        UpdateExpression: "SET #status = :status",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": status },
        ConditionExpression: "attribute_exists(reportId)",
        ReturnValues: "ALL_NEW",
      }),
    );
    return result.Attributes as LeakageReport;
  },
};
