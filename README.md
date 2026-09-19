# Application Setup Instructions

Follow these steps to configure your environment, provision the necessary AWS resources, and run the web application locally.

## 1. Configure the Server Environment

First, navigate to the server directory and create your local environment file.

```
cd server
copy .env.example .env

```

*(Note: If you are using Mac/Linux, use `cp` instead of `copy`)*

Open the newly created `server/.env` file in your text editor and set your AWS configuration:

* `AWS_REGION`

* Your AWS credentials (e.g., `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)

## 2. Provision AWS Resources

Run the provisioning script to automatically create the required infrastructure, including AWS Cognito, DynamoDB, and S3.

```
npm run provision -w server

```

**⚠️ Important:** Once the script completes, it will print several generated environment values to your terminal. **Copy these printed values and paste them into your `server/.env` file.**

## 3. Configure the Client Environment

Next, set up the environment variables for the frontend client.

```
copy client\.env.example client\.env.local

```

*(Note: For Mac/Linux, use `cp client/.env.example client/.env.local`)*

## 4. Start the Application

Finally, launch both the client and server development environments concurrently from the root of your project.

```
npm run dev

```

Once the servers spin up, you can access the application at:

* **Client (Frontend):** `http://localhost:3000`

* **Server (Backend):** `http://localhost:4000`