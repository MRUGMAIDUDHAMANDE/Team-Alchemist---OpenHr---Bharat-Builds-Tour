# OpenHR — Master Product, UX, Architecture & AWS Engineering Prompt

You are the lead product architect, senior full-stack engineer, AWS cloud architect, UI/UX designer, and DevOps engineer for a hackathon project called **OpenHR**.

We are participating in the **Amazon BharatBuild Hackathon**, specifically focusing on **Track: Ship It**. Therefore, the project must not only work locally but also demonstrate a realistic, secure, scalable, deployable AWS architecture.

Your job is to help design and implement the complete application while keeping the architecture understandable, production-oriented, and suitable for a hackathon demonstration.

---

# 1. PRODUCT

## Name

**OpenHR**

## Core idea

OpenHR is a real-time marketplace for **human availability**.

People publish:

* when they are available
* where they are available
* what skills they offer
* their hourly rate
* whether they are online or in-person

Other users can discover that availability and request/book them for a specific task.

The fundamental idea is:

> **If you're free, you're findable.**

OpenHR is **availability-first**, not job-first.

It is NOT intended to be a traditional freelancing platform or job board.

Traditional marketplace:

> Client posts job → freelancers apply → client chooses

OpenHR:

> Person becomes available → publishes availability → seeker discovers them → request → accept → booking

The system should make real-time availability the central concept.

---

# 2. TARGET USERS

There is one common user account, but a user can operate in different modes.

## Buyer / Seeker

A person or small business who needs someone for a task.

They can:

* search available people
* search using natural language
* filter by skill
* filter by location
* filter by availability time
* filter by price
* view profiles
* request/book a person
* upload task photos/files
* communicate through controlled platform mechanisms
* cancel bookings according to platform rules
* complete bookings
* review/rate publishers
* view booking history

## Seller / Publisher

A person offering their time and skills.

Examples:

* developer
* tutor
* designer
* consultant
* electrician
* photographer
* fitness trainer
* translator
* handyman

They can:

* create availability windows
* specify skills
* specify hourly rate
* specify location
* specify online/in-person mode
* update availability
* receive task requests
* accept/reject requests
* upload portfolio images
* manage bookings
* view earnings/commission
* receive reviews
* maintain their profile

## Admin

Administrators manage platform integrity.

Admin can:

* view users
* suspend/disable users
* review reported content
* review suspicious activity
* manage categories/skills
* view transactions/bookings
* view platform commission
* manage contact-us submissions
* investigate leakage/off-platform payment attempts
* manage platform settings

A normal user must never be able to access admin functionality.

---

# 3. CORE USER EXPERIENCE

The homepage should immediately communicate:

> **Find someone who's available. Or make yourself available.**

Primary actions:

* **Find Help**
* **I'm Available**

A user should be able to switch between buying and selling.

Example:

A developer may search for a tutor today and publish a React-development availability slot tomorrow.

Therefore, do NOT create completely separate buyer and seller accounts.

---

# 4. CORE FEATURES

## 4.1 Authentication

Use **Amazon Cognito**.

Support:

* signup
* login
* logout
* email verification
* password reset
* authenticated sessions
* JWT-based authorization

Never implement password storage manually.

---

# 4.2 User Profiles

Every user has a profile.

Possible fields:

* userId
* name
* profile photo
* bio
* skills
* experience
* hourly rate
* location
* service radius
* languages
* online/in-person preference
* ratings
* completed bookings
* verification status
* createdAt

Public profiles must expose only appropriate information.

Do not expose:

* password information
* private contact details
* private location information
* internal moderation information
* payment credentials

---

# 4.3 Availability

Availability is the core entity of OpenHR.

A publisher can create something like:

Skill:

> React Development

Date:

> 18 September

Time:

> 4:00 PM – 6:00 PM

Rate:

> ₹700/hour

Location:

> Pune

Mode:

> Online

The availability object should contain concepts such as:

* availabilityId
* publisherId
* skills
* startTime
* endTime
* location
* latitude/longitude where appropriate
* service radius
* hourlyRate
* mode
* status
* createdAt
* updatedAt

Possible statuses:

* AVAILABLE
* BOOKED
* CANCELLED
* EXPIRED

Avoid unnecessary state complexity.

---

# 4.4 Real-Time Availability

The platform must support frequent availability updates.

Publishers may:

* become available
* become unavailable
* change their location
* change their availability window
* book another task
* finish a task

The architecture should support high-frequency reads/writes without relying on a traditional always-running server.

Use AWS serverless architecture where appropriate.

---

# 4.5 Geospatial Discovery

Seekers should be able to search based on location.

Examples:

> Find electricians within 5 km.

> Find tutors near Pune.

> Find available developers online.

> Find photographers within my area.

Store appropriate geospatial information.

Do NOT expose precise private location publicly.

The system can use:

* approximate location
* service radius
* geohash or equivalent spatial indexing
* online/offline mode

The design should consider DynamoDB access patterns rather than attempting arbitrary SQL-style geographic queries.

If a dedicated AWS location service is genuinely necessary, evaluate it, but do not add unnecessary services merely for the sake of using more AWS products.

---

# 4.6 Search & Filters

Users should be able to filter by:

* skill
* category
* location
* distance
* date
* time
* availability
* hourly rate
* online/in-person
* rating

Search results should prioritize currently available people/slots.

---

# 4.7 AI-Powered Perfect Matching

Use **Amazon Bedrock**.

Do NOT use another paid AI provider such as OpenAI, Gemini, etc.

AWS credits are available, so Bedrock should be used where it adds genuine value.

The main AI feature should be:

## Natural-language matching

A seeker can write:

> "I need someone in Pune today from 4 to 6 PM who can fix my React application and preferably charges less than ₹800 per hour."

Bedrock should extract structured requirements such as:

```json
{
  "skills": ["React", "JavaScript", "Debugging"],
  "location": "Pune",
  "date": "today",
  "startTime": "16:00",
  "endTime": "18:00",
  "maxHourlyRate": 800,
  "mode": "ANY"
}
```

Then the normal backend/search engine should retrieve actual available users.

AI must NOT directly make booking decisions.

AI must NOT determine authorization.

AI must NOT determine whether a booking is legally or financially valid.

AI should assist discovery/matching, while deterministic backend logic controls the platform.

Potential second AI feature:

Given a task description, identify relevant skills.

Example:

> "My website has a React component that crashes when I submit a form."

Possible extracted skills:

* React
* JavaScript
* Frontend Development
* Debugging

Use those skills to improve matching.

Keep AI usage cost-efficient:

* do not call Bedrock unnecessarily
* use structured outputs where possible
* cache reusable results where appropriate
* keep prompts concise
* do not send private data unnecessarily

---

# 4.8 Secure Media & Artifact Storage

Publishers need to upload:

* portfolio images
* certificates where appropriate
* work samples

Seekers may upload:

* task photos
* screenshots
* relevant files

Use **Amazon S3**.

Requirements:

* S3 bucket should not be publicly writable
* use secure upload mechanisms
* use pre-signed URLs where appropriate
* validate file type
* validate file size
* restrict access
* avoid storing large files directly in DynamoDB

Store metadata in DynamoDB and actual files in S3.

Example:

```text
DynamoDB
portfolioId
userId
s3Key
fileType
createdAt

S3
actual image/file
```

---

# 4.9 Booking / Request System

A seeker can request an available publisher.

Example:

```text
Publisher:
Rahul

Skill:
Python

Availability:
4 PM – 6 PM

Rate:
₹700/hour
```

Seeker sends:

> "I need help debugging my Python API."

Request status:

* PENDING
* ACCEPTED
* REJECTED
* CANCELLED
* EXPIRED

Once accepted, create a booking.

Booking statuses:

* CONFIRMED
* IN_PROGRESS
* COMPLETED
* CANCELLED

---

# 4.10 Concurrency & First-to-Accept

This is a critical backend requirement.

When a valuable/limited opportunity is available, multiple users may attempt to accept it simultaneously.

Example:

```text
Task / Slot
     |
     ├── Publisher A accepts
     ├── Publisher B accepts
     └── Publisher C accepts
```

Only one must win.

OR, for publisher availability:

```text
Availability Slot
     |
     ├── Seeker A requests
     ├── Seeker B requests
     └── Seeker C requests
```

When the publisher accepts one request, only one booking can become confirmed.

The backend must guarantee:

> **First successful atomic acceptance wins.**

Do NOT implement this only with frontend checks.

Do NOT use:

```text
if available:
    update later
```

because concurrent requests can both pass the check.

Use DynamoDB conditional writes and/or DynamoDB transactions as appropriate.

The operation should conceptually be:

```text
IF slot.status == AVAILABLE
    THEN atomically change status to BOOKED
    AND create/confirm booking
ELSE
    reject acceptance
```

The system must never double-book the same slot.

Explain and document this mechanism clearly because it is an important technical feature for the hackathon.

---

# 4.11 Notifications — Amazon SNS

Use **Amazon SNS** for notifications where appropriate.

Possible notifications:

### Publisher

* new request
* request cancelled
* booking confirmed
* reminder
* cancellation

### Seeker

* request accepted
* request rejected
* booking confirmed
* reminder
* cancellation

Design notification delivery so that failure to send a notification does not corrupt booking state.

The booking transaction must remain authoritative.

---

# 4.12 Event-Driven Architecture

Use **Amazon EventBridge** where it naturally fits.

Potential events:

```text
AvailabilityCreated
AvailabilityExpired
BookingCreated
BookingConfirmed
BookingCancelled
BookingCompleted
ReviewCreated
```

EventBridge can trigger downstream workflows.

Avoid tightly coupling every feature to every other feature.

---

# 4.13 Step Functions

Use **AWS Step Functions** for workflows that involve multiple stages or waiting.

Example:

```text
Booking confirmed
       ↓
Wait until reminder time
       ↓
Send reminder
       ↓
Wait until booking end
       ↓
Mark booking completed
       ↓
Request review
```

Do not use Step Functions for simple CRUD operations.

---

# 4.14 Reviews & Ratings

After a completed booking, allow the appropriate participants to leave reviews.

Possible:

```text
Rating: 1–5
Review text
```

Rules:

* only participants of a completed booking can review
* prevent duplicate reviews for the same booking
* users cannot review a booking they were not part of
* rating calculations should be deterministic
* moderation should be possible
* admin can investigate reported reviews

Do not allow users to manipulate ratings through arbitrary API calls.

---

# 4.15 Platform Integrity & Leakage Prevention

A major marketplace problem is off-platform leakage.

Users may attempt:

> "Let's cancel this and I'll pay you directly."

The product should be designed so that users have incentives to remain on-platform.

Potential mechanisms:

### Controlled communication

Do not expose unnecessary personal contact details.

### Platform value

Provide:

* booking history
* payment records
* dispute support
* reviews
* trust signals
* verified profiles
* cancellation handling
* platform protection

### Leakage detection

Potentially detect suspicious messages containing:

* phone numbers
* email addresses
* payment IDs
* external payment handles
* phrases suggesting off-platform payment

AI may assist moderation, but deterministic rules should handle obvious cases.

Do not make false accusations automatically.

Flag suspicious content for review where appropriate.

---

# 4.16 Commission

OpenHR charges commission from both parties.

Define commission separately:

```text
Buyer commission
+
Seller commission
=
Platform revenue
```

Do NOT hardcode commission percentages throughout the application.

Create configurable platform settings.

For example:

```text
buyerCommissionPercent
sellerCommissionPercent
```

The final percentages should be configurable by admin.

Clearly show fees before confirmation.

Keep calculations deterministic.

If actual payment processing is implemented, design it separately from booking logic.

---

# 4.17 Payments

If implementing payments in the hackathon, isolate payment logic behind a service/module.

Do not allow payment success/failure to directly bypass booking authorization.

A possible flow:

```text
Request
 ↓
Acceptance
 ↓
Booking
 ↓
Payment
 ↓
Confirmed
```

If payment integration would make the MVP unnecessarily large, create the architecture so it can be added later rather than making the entire system dependent on it.

---

# 4.18 Contact Us

Create a Contact Us page.

Fields:

* name
* email
* category
* message

Possible categories:

* General
* Technical issue
* Payment
* Safety
* Report user
* Partnership
* Other

Store submissions securely.

Admin should be able to view/manage them.

---

# 5. ADMIN DASHBOARD

Create a simple but useful admin dashboard.

Possible sections:

```text
Dashboard
Users
Availability
Bookings
Reports
Reviews
Contact Messages
Commission
Platform Settings
```

Dashboard metrics can include:

* total users
* active publishers
* active availability slots
* bookings
* completed bookings
* platform commission
* reported content

Do not overbuild the admin panel.

---

# 6. AWS ARCHITECTURE

The project should use AWS as the primary cloud platform.

Required/preferred services:

## Frontend

**AWS Amplify Hosting**

Deploy the React frontend.

The final application should have a publicly accessible HTTPS URL.

---

## Authentication

**Amazon Cognito**

For:

* signup
* login
* verification
* authentication
* JWT

---

## API

**Amazon API Gateway**

Expose REST APIs or HTTP APIs.

Example:

```text
/auth
/users
/availability
/search
/requests
/bookings
/reviews
/notifications
/admin
/media
/contact
```

---

## Backend

**AWS Lambda**

Use Lambda for serverless backend operations.

Keep business logic modular.

Possible functions:

```text
createAvailability
searchAvailability
getAvailability
updateAvailability
deleteAvailability

createRequest
acceptRequest
rejectRequest

createBooking
cancelBooking
completeBooking

getProfile
updateProfile

createReview
getReviews

generateUploadUrl
processNotification

adminOperations
```

Do not create excessive Lambda functions without architectural reason.

---

## Database

**Amazon DynamoDB**

Use DynamoDB for:

* users
* availability
* requests
* bookings
* reviews
* notifications
* platform settings
* contact submissions
* relevant metadata

Before implementation, design access patterns first.

Think in terms of:

```text
What will we query?
How often?
By which key?
What needs to be strongly consistent?
What needs a conditional write?
```

Do not simply design DynamoDB like a relational SQL database.

---

## Storage

**Amazon S3**

For:

* profile images
* portfolio images
* task images
* documents

Use private buckets and controlled access.

---

## AI

**Amazon Bedrock**

For:

* natural-language search
* skill extraction
* semantic matching assistance
* optional task-description assistance

The actual booking and authorization system must remain deterministic.

---

## Notifications

**Amazon SNS**

For notification delivery.

---

## Events

**Amazon EventBridge**

For domain events and scheduled/event-driven processing.

---

## Workflows

**AWS Step Functions**

For multi-step booking/reminder/review workflows.

---

## Monitoring

Use:

**Amazon CloudWatch**

For:

* Lambda logs
* API errors
* metrics
* failures
* debugging
* operational monitoring

---

# 7. POSSIBLE ARCHITECTURE

Use a structure similar to:

```text
                    USER
                      |
                      v
             AWS Amplify Hosting
                      |
                  React App
                      |
          +-----------+-----------+
          |                       |
          v                       v
      Cognito               API Gateway
                                  |
                                  v
                              Lambda
                                  |
          +-----------+-----------+------------+
          |           |           |            |
          v           v           v            v
      DynamoDB       S3       Bedrock       SNS
          |
          |
     EventBridge
          |
          v
    Step Functions
          |
          v
      Lambda
```

CloudWatch should monitor the backend components.

If an additional AWS service materially improves the geospatial requirement, security, or observability, evaluate it, but avoid unnecessary service sprawl.

---

# 8. SECURITY REQUIREMENTS

Follow AWS security best practices.

Use:

* IAM least privilege
* Cognito authentication
* backend authorization
* HTTPS
* private S3 buckets
* pre-signed URLs
* input validation
* output validation
* rate limiting where appropriate
* secure secrets management
* CloudWatch monitoring
* proper CORS configuration
* no credentials committed to Git

Never put:

```text
AWS_SECRET_ACCESS_KEY
AWS credentials
database credentials
API secrets
```

in frontend code or Git.

Use environment variables / AWS-native secret management as appropriate.

---

# 9. AUTHORIZATION MODEL

Permissions should be enforced by the backend.

A normal user can:

* read public profiles
* search availability
* create their own availability
* edit their own availability
* delete their own availability
* create requests
* view their own requests
* manage their own bookings
* review completed bookings they participated in

A publisher can:

* manage their own availability
* accept/reject requests belonging to their availability

A seeker can:

* create requests
* cancel their own requests
* manage their own bookings

Admin can perform administrative operations.

A user must NEVER be able to modify another user's resources merely by changing an ID in the API request.

---

# 10. UI/UX DIRECTION

Reference visual inspiration:

**https://www.wing.app/**

Use the referenced site only as visual inspiration.

Do NOT copy its exact design, assets, branding, or proprietary content.

Desired OpenHR visual style:

* modern
* clean
* premium
* minimal
* professional
* spacious
* human-centered
* strong typography
* subtle animations
* clear cards
* excellent mobile responsiveness

The UI should feel like a modern startup product rather than a generic college CRUD project.

---

# 11. IMPORTANT SCREENS

Design and implement at least:

## Public

1. Landing page
2. Explore / Discover
3. Login
4. Signup
5. Contact Us

## Authenticated

6. Dashboard
7. Profile
8. Edit Profile
9. Create Availability
10. My Availability
11. Search Results
12. Publisher Profile
13. Request Booking
14. My Requests
15. My Bookings
16. Notifications
17. Reviews

## Admin

18. Admin Dashboard
19. Users
20. Reports
21. Bookings
22. Contact Messages
23. Platform Settings

---

# 12. LANDING PAGE

The first screen should immediately communicate the product.

Possible headline direction:

> **Your time is valuable. Make it available.**

Supporting text:

> Find skilled people who are available when you need them — or turn your free time into an opportunity.

Primary CTA:

**Find Someone**

Secondary CTA:

**List Your Availability**

Include a live-looking availability discovery section.

Example card:

```text
AVAILABLE NOW

Rahul Sharma
Python Developer

Pune • Online

₹700/hour

Available:
4:00 PM – 6:00 PM

[View Profile]
[Request Slot]
```

---

# 13. FRONTEND

Preferred stack:

* React
* modern component architecture
* responsive design
* clean state management
* API abstraction
* authentication integration
* reusable components

Avoid putting business logic directly into UI components.

Create reusable components for:

* availability cards
* profile cards
* booking status
* filters
* rating display
* notifications
* loading states
* error states
* confirmation dialogs

---

# 14. BACKEND ENGINEERING

Use a clear layered approach:

```text
API handler
    ↓
Validation
    ↓
Authorization
    ↓
Service/business logic
    ↓
Repository/data access
    ↓
AWS service
```

Do not put all business logic inside Lambda handlers.

Centralize important business rules.

Especially:

* booking
* commission calculation
* authorization
* availability transitions
* first-to-accept logic

---

# 15. DATABASE DESIGN

Before writing implementation code, produce:

1. entities
2. attributes
3. primary keys
4. sort keys
5. GSIs
6. access patterns
7. conditional expressions
8. transaction requirements
9. indexes needed for search
10. expected read/write patterns

Important entities:

```text
User
Availability
Request
Booking
Review
Notification
Media
ContactMessage
PlatformSettings
Report
```

Do not blindly create indexes for every attribute.

---

# 16. API DESIGN

Before implementation, produce a complete API specification.

For every endpoint define:

* method
* path
* authentication requirement
* authorization requirement
* request body
* response body
* errors
* status codes
* validation rules

Example:

```text
POST /availability
Authorization: Required

Request:
{
  "skills": ["React"],
  "startTime": "...",
  "endTime": "...",
  "hourlyRate": 700,
  "mode": "ONLINE"
}
```

---

# 17. ERROR HANDLING

Every API must return predictable errors.

Examples:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
429 Too Many Requests
500 Internal Server Error
```

Use **409 Conflict** for cases such as:

> Availability was already booked by another user.

The frontend should display useful human-readable messages.

---

# 18. CONCURRENCY TESTING

Explicitly test:

```text
10 simultaneous acceptance requests
```

against the same availability/task.

Expected:

```text
1 → SUCCESS
9 → CONFLICT/FAIL
```

There must be exactly one confirmed booking.

Also test:

* simultaneous cancellation
* simultaneous slot updates
* expired slot + acceptance
* acceptance after another booking
* duplicate requests

This is a major demonstration point.

---

# 19. TESTING

Include:

### Unit tests

For:

* validation
* commission calculations
* availability rules
* booking rules
* matching logic

### Integration tests

For:

* API Gateway → Lambda
* Lambda → DynamoDB
* Cognito authorization
* S3 upload
* Bedrock integration

### Concurrency tests

For first-to-accept.

### Frontend tests

For critical booking/search flows.

---

# 20. DEVOPS / SHIP IT

This is an **Amazon BharatBuild — Ship It** project.

Deployment must be a first-class part of the project.

The application should be deployable from Git.

Use appropriate AWS deployment mechanisms.

The final project should demonstrate:

```text
Git repository
     ↓
Build
     ↓
Test
     ↓
Deploy
     ↓
AWS infrastructure
     ↓
Live application URL
```

Where appropriate, use:

* infrastructure as code
* environment separation
* CI/CD
* automated builds
* automated tests
* deployment configuration

Do not manually configure everything in a way that cannot be reproduced.

---

# 21. ENVIRONMENTS

Support at least conceptually:

```text
development
production
```

Do not commit production secrets.

Keep environment-specific configuration separate.

---

# 22. OBSERVABILITY

Use CloudWatch.

Monitor:

* Lambda invocation
* Lambda errors
* API errors
* latency
* DynamoDB failures
* failed workflows
* notification failures

Create useful logs.

Do not log:

* passwords
* tokens
* secrets
* unnecessary private user information

---

# 23. COST OPTIMIZATION

AWS credits are available, but design the application to be cost-conscious.

Prefer:

* serverless
* pay-per-use
* Lambda
* DynamoDB on-demand where appropriate
* S3
* managed AWS services

Avoid keeping unnecessary servers running.

Bedrock calls should be minimized and optimized.

Do not introduce paid third-party services unless absolutely necessary.

---

# 24. PRODUCT RULES

These rules are authoritative:

### Rule 1

Availability is the primary marketplace object.

### Rule 2

A user can act as both buyer and seller.

### Rule 3

A user can only modify their own resources unless they are an authorized admin.

### Rule 4

Only one booking can win a contested slot.

### Rule 5

First successful atomic acceptance wins.

### Rule 6

Frontend checks are never sufficient for authorization or concurrency.

### Rule 7

AI assists matching but does not control business-critical decisions.

### Rule 8

Private media must remain protected.

### Rule 9

Platform fees must be transparent.

### Rule 10

The application must remain usable without AI for core functionality.

---

# 25. HACKATHON DEMONSTRATION FLOW

The final application should support an impressive but realistic end-to-end demo.

### Demo 1 — Publisher

Create an account.

Publish:

```text
Python Developer
Pune
₹700/hour
4 PM – 6 PM
Online
```

### Demo 2 — Seeker

Search:

> "I need a Python developer in Pune today evening under ₹800."

Bedrock extracts the requirements.

The application displays matching available publishers.

### Demo 3 — Request

Seeker requests the slot.

Publisher receives notification through SNS.

### Demo 4 — Concurrency

Simulate multiple requests/acceptance attempts.

Show that only one booking becomes confirmed.

### Demo 5 — Media

Publisher uploads portfolio image to S3.

Seeker uploads task image.

### Demo 6 — Booking

Booking progresses through its lifecycle.

EventBridge / Step Functions handle scheduled workflow/reminder behavior.

### Demo 7 — Completion

Booking becomes completed.

User leaves a rating/review.

### Demo 8 — Admin

Admin dashboard displays:

* users
* bookings
* commission
* reports
* contact submissions

---

# 26. DEVELOPMENT METHODOLOGY

Do NOT immediately generate the entire application in one giant implementation.

Work incrementally.

First produce:

## Phase 1 — Architecture

* system architecture
* AWS architecture
* component diagram
* data flow
* security boundaries

## Phase 2 — Product specification

* features
* roles
* permissions
* user journeys
* business rules
* edge cases

## Phase 3 — Database

* DynamoDB schema
* access patterns
* GSIs
* transactions
* conditional writes

## Phase 4 — API

* endpoint specification
* authentication
* authorization
* request/response schemas

## Phase 5 — Frontend

* page structure
* components
* routing
* state management
* responsive UI

## Phase 6 — Backend

* Lambda
* API Gateway
* DynamoDB
* Cognito

## Phase 7 — AWS integrations

* S3
* SNS
* EventBridge
* Step Functions
* Bedrock

## Phase 8 — Testing

* unit
* integration
* concurrency
* security

## Phase 9 — Deployment

* infrastructure
* CI/CD
* Amplify
* production configuration
* monitoring

---

# 27. IMPORTANT ENGINEERING PRINCIPLES

When making implementation decisions:

1. Prefer simple architecture over unnecessary complexity.
2. Use AWS services because they solve real requirements, not merely to increase the service count.
3. Keep core business logic deterministic.
4. Keep AI isolated behind a well-defined service.
5. Design DynamoDB around access patterns.
6. Protect every resource with backend authorization.
7. Design for concurrent requests.
8. Make deployment reproducible.
9. Make failures observable.
10. Keep the application functional if an AI request temporarily fails.
11. Never expose AWS credentials to the frontend.
12. Never trust client-side authorization.
13. Never assume frontend availability checks prevent double booking.
14. Validate all user-controlled input.
15. Build the MVP first, then add enhancement features.

---

# 28. YOUR FIRST TASK

Before writing application code, do NOT start implementing.

First provide me with:

### A. Complete product architecture

### B. User roles and detailed permissions matrix

### C. MVP features vs future features

### D. Complete user journeys

### E. Business rules and edge cases

### F. AWS architecture diagram in text

### G. DynamoDB schema and access patterns

### H. Required GSIs and why

### I. API endpoint specification

### J. Authentication and authorization architecture

### K. Bedrock integration design

### L. S3 media architecture

### M. SNS notification architecture

### N. EventBridge + Step Functions workflow

### O. Concurrency/transaction design

### P. Geospatial availability design

### Q. Reviews/rating architecture

### R. Commission architecture

### S. Leakage-prevention design

### T. Deployment/CI-CD architecture

### U. Security checklist

### V. Testing strategy

### W. Recommended development order for a small hackathon team

Do not skip architectural decisions.

Where there are multiple valid approaches, compare them briefly and recommend one based on:

* simplicity
* AWS-native implementation
* scalability
* security
* hackathon implementation time
* cost
* ease of demonstrating the architecture

Do not add unnecessary features just to make the project appear larger.

The final product should feel like a **real, polished, deployable marketplace**, not a collection of AWS demos.