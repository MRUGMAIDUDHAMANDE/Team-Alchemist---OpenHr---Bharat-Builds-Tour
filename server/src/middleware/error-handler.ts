import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError, isAppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { isProduction } from "../config/env";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`No route matches ${req.method} ${req.path}`));
};

/**
 * Single place where errors become HTTP responses. Known `AppError`s keep their
 * code/status/message; everything else is logged and reduced to a generic 500 so
 * internal details never leak to a client.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  // body-parser throws a SyntaxError subclass for malformed JSON.
  if (
    error instanceof SyntaxError &&
    "status" in error &&
    (error as { status?: number }).status === 400
  ) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "The request body is not valid JSON." },
    });
    return;
  }

  if (isAppError(error)) {
    if (error.status >= 500) {
      logger.error("Request failed", {
        code: error.code,
        path: req.path,
        method: req.method,
        error: error.message,
      });
    } else {
      logger.warn("Request rejected", {
        code: error.code,
        status: error.status,
        path: req.path,
        method: req.method,
      });
    }

    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  logger.error("Unhandled error", {
    path: req.path,
    method: req.method,
    error: error instanceof Error ? error.message : String(error),
    stack: isProduction ? undefined : error instanceof Error ? error.stack : undefined,
  });

  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
  });
};
