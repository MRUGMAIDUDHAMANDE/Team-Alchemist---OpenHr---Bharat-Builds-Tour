import rateLimit from "express-rate-limit";
import { AppError } from "../lib/errors";

/**
 * Brute-force protection for credential endpoints. Cognito has its own limits,
 * but a per-IP guard keeps us from burning those (and from noisy abuse) first.
 * Returns our standard error envelope so the client handles it uniformly.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new AppError({
        code: "RATE_LIMITED",
        status: 429,
        message: "Too many attempts. Wait a few minutes and try again.",
      }),
    );
  },
});

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new AppError({
        code: "RATE_LIMITED",
        status: 429,
        message: "Too many requests. Slow down and try again.",
      }),
    );
  },
});
