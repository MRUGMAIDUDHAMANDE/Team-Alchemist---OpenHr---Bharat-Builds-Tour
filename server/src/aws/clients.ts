import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { SNSClient } from "@aws-sdk/client-sns";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "../config/env";

/**
 * When explicit keys are present we use them (local development / CI). When
 * they are absent the SDK falls back to its default provider chain, which is
 * how the server authenticates on Lambda, ECS, or EC2 via an IAM role. This is
 * the "least privilege, no secrets in code" path we want in production.
 */
const explicitCredentials =
  env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        ...(env.AWS_SESSION_TOKEN ? { sessionToken: env.AWS_SESSION_TOKEN } : {}),
      }
    : undefined;

const baseClientConfig = {
  region: env.AWS_REGION,
  ...(explicitCredentials ? { credentials: explicitCredentials } : {}),
};

export const cognitoClient = new CognitoIdentityProviderClient(baseClientConfig);

export const bedrockClient = new BedrockRuntimeClient({
  ...baseClientConfig,
  region: env.BEDROCK_REGION ?? env.AWS_REGION,
});

const dynamoDbClient = new DynamoDBClient(baseClientConfig);

/**
 * Document client gives us plain JS objects instead of AttributeValue maps.
 * `removeUndefinedValues` lets us omit optional profile fields safely.
 */
export const ddb = DynamoDBDocumentClient.from(dynamoDbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

export const s3Client = new S3Client({
  ...baseClientConfig,
  region: env.S3_REGION ?? env.AWS_REGION,
});

export const snsClient = new SNSClient(baseClientConfig);
