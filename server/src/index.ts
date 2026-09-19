import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info("OpenHR API listening", {
    port: env.PORT,
    environment: env.NODE_ENV,
    corsOrigins: env.CORS_ORIGINS,
  });
});

function shutdown(signal: string) {
  logger.info("Shutting down", { signal });
  server.close(() => process.exit(0));
  // Force-exit if connections do not drain in time.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
