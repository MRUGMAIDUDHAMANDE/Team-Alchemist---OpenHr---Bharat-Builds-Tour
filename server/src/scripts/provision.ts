/**
 * One-time AWS bootstrap for the OpenHR auth stack.
 *
 *   npm run provision -w server
 *
 * Creates (or reuses) the resources the API needs and prints the values to drop
 * into `server/.env`. It reads credentials straight from the environment
 * (AWS_REGION / AWS_PROFILE / AWS_ACCESS_KEY_ID ...) so it can run before the
 * app's own .env is complete.
 *
 * This is intentionally an explicit script rather than hidden magic: it is the
 * reproducible record of the resources the hackathon build depends on. For a
 * full environment, the same resources are described in infrastructure-as-code.
 */
import {
  CognitoIdentityProviderClient,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  ListUserPoolClientsCommand,
  ListUserPoolsCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketEncryptionCommand,
  PutPublicAccessBlockCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import "dotenv/config";

const region = process.env.AWS_REGION ?? "ap-south-1";
const usersTable = process.env.DYNAMODB_USERS_TABLE ?? "openhr-users";
const availabilityTable = process.env.DYNAMODB_AVAILABILITY_TABLE ?? "openhr-availability";
const requestsTable = process.env.DYNAMODB_REQUESTS_TABLE ?? "openhr-requests";
const bookingsTable = process.env.DYNAMODB_BOOKINGS_TABLE ?? "openhr-bookings";
const reviewsTable = process.env.DYNAMODB_REVIEWS_TABLE ?? "openhr-reviews";
const bucketName = process.env.S3_BUCKET_NAME ?? "";

const cognito = new CognitoIdentityProviderClient({ region });
const dynamo = new DynamoDBClient({ region });
const s3 = new S3Client({ region });

const POOL_NAME = "openhr-user-pool";
const CLIENT_NAME = "openhr-web";

function log(step: string, detail: string) {
  console.log(`\n[provision] ${step}\n  ${detail}`);
}

async function ensureUserPool(): Promise<{ userPoolId: string; clientId: string }> {
  const listed = await cognito.send(
    new ListUserPoolsCommand({ MaxResults: 60 }),
  );
  const existing = listed.UserPools?.find((pool) => pool.Name === POOL_NAME);

  let userPoolId = existing?.Id;

  if (!userPoolId) {
    const created = await cognito.send(
      new CreateUserPoolCommand({
        PoolName: POOL_NAME,
        // Email-first accounts: the email is the username and sign-in alias.
        UsernameAttributes: ["email"],
        AutoVerifiedAttributes: ["email"],
        MfaConfiguration: "OFF",
        AdminCreateUserConfig: { AllowAdminCreateUserOnly: false },
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireUppercase: true,
            RequireLowercase: true,
            RequireNumbers: true,
            RequireSymbols: true,
            TemporaryPasswordValidityDays: 7,
          },
        },
        Schema: [
          { Name: "email", Required: true, Mutable: true },
          { Name: "name", Required: true, Mutable: true },
        ],
      }),
    );

    userPoolId = created.UserPool?.Id;
    log("Cognito User Pool created", userPoolId ?? "unknown");
  } else {
    log("Cognito User Pool already exists", userPoolId);
  }

  if (!userPoolId) throw new Error("Failed to resolve a Cognito User Pool id");

  const clients = await cognito
    .send(new ListUserPoolClientsCommand({ UserPoolId: userPoolId, MaxResults: 60 }))
    .catch(() => null);

  let clientId = clients?.UserPoolClients?.find((c) => c.ClientName === CLIENT_NAME)?.ClientId;

  if (!clientId) {
    const client = await cognito.send(
      new CreateUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientName: CLIENT_NAME,
        GenerateSecret: false,
        PreventUserExistenceErrors: "ENABLED",
        ExplicitAuthFlows: [
          "ALLOW_USER_PASSWORD_AUTH",
          "ALLOW_USER_SRP_AUTH",
          "ALLOW_REFRESH_TOKEN_AUTH",
        ],
        RefreshTokenValidity: 30,
        AccessTokenValidity: 60,
        IdTokenValidity: 60,
        TokenValidityUnits: {
          AccessToken: "minutes",
          IdToken: "minutes",
          RefreshToken: "days",
        },
      }),
    );
    clientId = client.UserPoolClient?.ClientId;
    log("Cognito App Client created", clientId ?? "unknown");
  } else {
    log("Cognito App Client already exists", clientId);
  }

  if (!clientId) throw new Error("Failed to resolve a Cognito App Client id");

  return { userPoolId, clientId };
}

async function ensureUsersTable(): Promise<string> {
  try {
    await dynamo.send(new DescribeTableCommand({ TableName: usersTable }));
    log("DynamoDB table already exists", usersTable);
    return usersTable;
  } catch {
    // fall through to create
  }

  await dynamo.send(
    new CreateTableCommand({
      TableName: usersTable,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "userId", AttributeType: "S" },
        { AttributeName: "email", AttributeType: "S" },
      ],
      KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
      GlobalSecondaryIndexes: [
        {
          IndexName: "email-index",
          KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
      ],
      Tags: [{ Key: "Project", Value: "OpenHR" }],
    }),
  );

  // Wait until the table is queryable.
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const described = await dynamo.send(new DescribeTableCommand({ TableName: usersTable }));
    if (described.Table?.TableStatus === "ACTIVE") break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  log("DynamoDB table created", usersTable);
  return usersTable;
}

async function ensureAvailabilityTable(): Promise<string> {
  try {
    await dynamo.send(new DescribeTableCommand({ TableName: availabilityTable }));
    log("DynamoDB table already exists", availabilityTable);
    return availabilityTable;
  } catch (error) {
    if (error instanceof Error && error.name !== "ResourceNotFoundException") {
      throw error;
    }
  }

  await dynamo.send(
    new CreateTableCommand({
      TableName: availabilityTable,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "availabilityId", AttributeType: "S" },
        { AttributeName: "publisherId", AttributeType: "S" },
        { AttributeName: "startTime", AttributeType: "S" },
        { AttributeName: "status", AttributeType: "S" },
      ],
      KeySchema: [{ AttributeName: "availabilityId", KeyType: "HASH" }],
      GlobalSecondaryIndexes: [
        {
          IndexName: "publisher-time-index",
          KeySchema: [
            { AttributeName: "publisherId", KeyType: "HASH" },
            { AttributeName: "startTime", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "status-time-index",
          KeySchema: [
            { AttributeName: "status", KeyType: "HASH" },
            { AttributeName: "startTime", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
      Tags: [{ Key: "Project", Value: "OpenHR" }],
    }),
  );

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const described = await dynamo.send(new DescribeTableCommand({ TableName: availabilityTable }));
    if (described.Table?.TableStatus === "ACTIVE") break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  log("DynamoDB table created", availabilityTable);
  return availabilityTable;
}

interface TableKey {
  AttributeName: string;
  KeyType: "HASH" | "RANGE";
}

interface TableIndex {
  IndexName: string;
  Keys: TableKey[];
}

async function ensureTable(table: string, attributes: string[], keys: TableKey[], indexes: TableIndex[]): Promise<string> {
  try {
    await dynamo.send(new DescribeTableCommand({ TableName: table }));
    log("DynamoDB table already exists", table);
    return table;
  } catch (error) {
    if (error instanceof Error && error.name !== "ResourceNotFoundException") {
      throw error;
    }
  }

  await dynamo.send(
    new CreateTableCommand({
      TableName: table,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: attributes.map((name) => ({ AttributeName: name, AttributeType: "S" })),
      KeySchema: keys.map((key) => ({ AttributeName: key.AttributeName, KeyType: key.KeyType })),
      GlobalSecondaryIndexes: indexes.map((index) => ({
        IndexName: index.IndexName,
        KeySchema: index.Keys.map((key) => ({ AttributeName: key.AttributeName, KeyType: key.KeyType })),
        Projection: { ProjectionType: "ALL" },
      })),
      Tags: [{ Key: "Project", Value: "OpenHR" }],
    }),
  );

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const described = await dynamo.send(new DescribeTableCommand({ TableName: table }));
    if (described.Table?.TableStatus === "ACTIVE") break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  log("DynamoDB table created", table);
  return table;
}

async function ensureRequestsTable(): Promise<string> {
  return ensureTable(
    requestsTable,
    ["requestId", "availabilityId", "seekerId", "publisherId", "createdAt"],
    [{ AttributeName: "requestId", KeyType: "HASH" }],
    [
      { IndexName: "availability-index", Keys: [{ AttributeName: "availabilityId", KeyType: "HASH" }] },
      {
        IndexName: "seeker-index",
        Keys: [
          { AttributeName: "seekerId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
      },
      {
        IndexName: "publisher-index",
        Keys: [
          { AttributeName: "publisherId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
      },
    ],
  );
}

async function ensureBookingsTable(): Promise<string> {
  return ensureTable(
    bookingsTable,
    ["bookingId", "availabilityId", "publisherId", "seekerId", "startTime"],
    [{ AttributeName: "bookingId", KeyType: "HASH" }],
    [
      { IndexName: "availability-index", Keys: [{ AttributeName: "availabilityId", KeyType: "HASH" }] },
      {
        IndexName: "publisher-index",
        Keys: [
          { AttributeName: "publisherId", KeyType: "HASH" },
          { AttributeName: "startTime", KeyType: "RANGE" },
        ],
      },
      {
        IndexName: "seeker-index",
        Keys: [
          { AttributeName: "seekerId", KeyType: "HASH" },
          { AttributeName: "startTime", KeyType: "RANGE" },
        ],
      },
    ],
  );
}

async function ensureReviewsTable(): Promise<string> {
  return ensureTable(
    reviewsTable,
    ["reviewId", "revieweeId", "bookingId", "createdAt"],
    [{ AttributeName: "reviewId", KeyType: "HASH" }],
    [
      {
        IndexName: "reviewee-index",
        Keys: [
          { AttributeName: "revieweeId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
      },
      { IndexName: "booking-index", Keys: [{ AttributeName: "bookingId", KeyType: "HASH" }] },
    ],
  );
}

async function ensureMediaBucket(): Promise<string | null> {
  if (!bucketName) {
    log("S3 bucket skipped", "Set S3_BUCKET_NAME to provision one.");
    return null;
  }

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    log("S3 bucket already exists", bucketName);
    return bucketName;
  } catch {
    // fall through to create
  }

  await s3.send(
    new CreateBucketCommand({
      Bucket: bucketName,
      ...(region === "us-east-1"
        ? {}
        : { CreateBucketConfiguration: { LocationConstraint: region as never } }),
    }),
  );

  // Private by default: block every form of public access.
  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    }),
  );

  await s3.send(
    new PutBucketEncryptionCommand({
      Bucket: bucketName,
      ServerSideEncryptionConfiguration: {
        Rules: [
          {
            ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" },
            BucketKeyEnabled: true,
          },
        ],
      },
    }),
  );

  // Browsers upload directly with short-lived pre-signed URLs, so CORS only
  // needs to allow the methods we sign.
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
            AllowedOrigins: ["*"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    }),
  );

  log("S3 bucket created (private, encrypted)", bucketName);
  return bucketName;
}

async function main() {
  console.log(`\nProvisioning OpenHR auth stack in ${region} ...`);

  const { userPoolId, clientId } = await ensureUserPool();
  const table = await ensureUsersTable();
  const slots = await ensureAvailabilityTable();
  const requests = await ensureRequestsTable();
  const bookings = await ensureBookingsTable();
  const reviews = await ensureReviewsTable();
  const bucket = await ensureMediaBucket();

  console.log("\n────────────────────────────────────────────────────────────");
  console.log("Add these to server/.env");
  console.log("────────────────────────────────────────────────────────────");
  console.log(`AWS_REGION=${region}`);
  console.log(`COGNITO_USER_POOL_ID=${userPoolId}`);
  console.log(`COGNITO_CLIENT_ID=${clientId}`);
  console.log(`DYNAMODB_USERS_TABLE=${table}`);
  console.log(`DYNAMODB_AVAILABILITY_TABLE=${slots}`);
  console.log(`DYNAMODB_REQUESTS_TABLE=${requests}`);
  console.log(`DYNAMODB_BOOKINGS_TABLE=${bookings}`);
  console.log(`DYNAMODB_REVIEWS_TABLE=${reviews}`);
  console.log(`S3_BUCKET_NAME=${bucket ?? ""}`);
  console.log(`S3_REGION=${region}`);
  console.log("────────────────────────────────────────────────────────────");
  console.log("Notes:");
  console.log("  - Keep AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in server/.env (or");
  console.log("    use an IAM role in production). Never ship them to the client.");
  console.log("  - Cognito sends verification emails via its default sender; add SES");
  console.log("    for production volume.");
  console.log("");
}

main().catch((error) => {
  console.error("\n[provision] failed:", error);
  process.exit(1);
});
