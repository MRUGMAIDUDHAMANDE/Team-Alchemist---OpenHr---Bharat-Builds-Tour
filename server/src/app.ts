import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { corsOrigins, env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { generalRateLimiter } from "./middleware/rate-limit";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { availabilityRouter } from "./modules/availability/availability.routes";

/**
 * Builds the Express application without starting a listener. Keeping app
 * creation separate makes it trivial to mount in tests or wrap for Lambda
 * (serverless-http) without running a long-lived server.
 */
export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  // Behind API Gateway / a load balancer the client IP arrives in X-Forwarded-For.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(generalRateLimiter);

  app.get("/health", (_req, res) => {
    res.json({
      data: {
        status: "ok",
        service: "openhr-api",
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/availability", availabilityRouter);

  // Order matters: unmatched routes -> 404, then the error boundary.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
