import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  /**
   * Comma separated list of allowed browser origins for CORS.
   * Example: "http://localhost:3000,https://your-amplify-domain.amplifyapp.com"
   */
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  /**
   * AWS credentials are optional on purpose. When the server runs on Lambda,
   * ECS, EC2, or any host with an instance/task role, the SDK picks up the role
   * automatically. Locally you can supply a dedicated IAM user or SSO profile.
   */
  AWS_REGION: z.string().min(1, "AWS_REGION is required"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SESSION_TOKEN: z.string().optional(),

  /**
   * Amazon Cognito User Pool. The client must have USER_PASSWORD_AUTH and
   * REFRESH_TOKEN_AUTH enabled because this API performs the auth flows
   * server-side on behalf of the browser.
   */
  COGNITO_USER_POOL_ID: z.string().min(1, "COGNITO_USER_POOL_ID is required"),
  COGNITO_CLIENT_ID: z.string().min(1, "COGNITO_CLIENT_ID is required"),
  COGNITO_CLIENT_SECRET: z.string().optional(),

  /** DynamoDB table that stores user profiles. */
  DYNAMODB_USERS_TABLE: z.string().default("openhr-users"),
  /** DynamoDB table that stores availability slots. */
  DYNAMODB_AVAILABILITY_TABLE: z.string().default("openhr-availability"),
  /** DynamoDB table that stores booking requests. */
  DYNAMODB_REQUESTS_TABLE: z.string().default("openhr-requests"),
  /** DynamoDB table that stores confirmed bookings. */
  DYNAMODB_BOOKINGS_TABLE: z.string().default("openhr-bookings"),
  /** DynamoDB table that stores booking reviews. */
  DYNAMODB_REVIEWS_TABLE: z.string().default("openhr-reviews"),
  /** DynamoDB table that stores upload metadata. */
  DYNAMODB_MEDIA_TABLE: z.string().default("openhr-media"),
  /** DynamoDB table that stores contact submissions. */
  DYNAMODB_CONTACT_TABLE: z.string().default("openhr-contact"),
  /** DynamoDB table that stores in-app notifications. */
  DYNAMODB_NOTIFICATIONS_TABLE: z.string().default("openhr-notifications"),
  /** Amazon SNS topic for event fan-out. Empty disables SNS delivery. */
  SNS_TOPIC_ARN: z.string().optional(),

  /** Amazon Bedrock inference profile used only for search assistance. */
  BEDROCK_MODEL_ID: z.string().default("apac.amazon.nova-micro-v1:0"),
  BEDROCK_REGION: z.string().optional(),

  /** Amazon S3 bucket for private media (wired up in a later milestone). */
  S3_BUCKET_NAME: z.string().optional(),
  S3_REGION: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

function loadEnv(): AppEnv {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration. Check server/.env against server/.env.example:\n${details}`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const isProduction = env.NODE_ENV === "production";
