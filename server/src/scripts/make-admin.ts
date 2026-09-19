import {
  AdminAddUserToGroupCommand,
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
  CreateGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import "dotenv/config";

const ADMIN_GROUP = "ADMIN";

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("\nUsage: npm run make-admin -w server -- user@example.com\n");
    process.exit(1);
  }

  const region = process.env.AWS_REGION ?? "ap-south-1";
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const usersTable = process.env.DYNAMODB_USERS_TABLE ?? "openhr-users";
  if (!userPoolId) {
    console.error("\nSet COGNITO_USER_POOL_ID before promoting an admin.\n");
    process.exit(1);
  }

  const cognito = new CognitoIdentityProviderClient({ region });

  try {
    await cognito.send(new CreateGroupCommand({ GroupName: ADMIN_GROUP, UserPoolId: userPoolId }));
    console.log(`\n[make-admin] Cognito group created: ${ADMIN_GROUP}`);
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "GroupExistsException") throw error;
    console.log(`\n[make-admin] Cognito group already exists: ${ADMIN_GROUP}`);
  }

  await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: email, GroupName: ADMIN_GROUP }));
  console.log(`[make-admin] Added to ${ADMIN_GROUP}: ${email}`);

  const adminUser = await cognito.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: email }));
  const sub = adminUser.UserAttributes?.find((attribute) => attribute.Name === "sub")?.Value;
  if (!sub) throw new Error("Could not resolve the Cognito sub for that email");

  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  await ddb.send(
    new UpdateCommand({
      TableName: usersTable,
      Key: { userId: sub },
      UpdateExpression: "SET #role = :role, updatedAt = :now",
      ExpressionAttributeNames: { "#role": "role" },
      ExpressionAttributeValues: { ":role": "ADMIN", ":now": new Date().toISOString() },
      ConditionExpression: "attribute_exists(userId)",
    }),
  );
  console.log(`[make-admin] Profile role set to ADMIN for ${email}\n`);
}

main().catch((error) => {
  console.error("\n[make-admin] failed:", error);
  process.exit(1);
});
