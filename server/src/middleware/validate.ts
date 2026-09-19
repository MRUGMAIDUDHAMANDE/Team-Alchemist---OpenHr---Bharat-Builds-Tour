import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { AppError } from "../lib/errors";

type Source = "body" | "query" | "params";

/**
 * Validates and normalises a request payload against a Zod schema. Parsed
 * output replaces the raw value so downstream code only ever sees sanitised,
 * typed data.
 */
export function validate(schema: ZodTypeAny, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(
        AppError.badRequest(
          "Some fields need attention.",
          result.error.flatten().fieldErrors,
        ),
      );
      return;
    }

    req[source] = result.data;
    next();
  };
}
