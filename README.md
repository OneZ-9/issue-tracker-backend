# Issue Tracker Backend

A RESTful API backend for a JIRA-inspired issue tracking application. Built with Node.js, Express, and MongoDB.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Installation & Setup](#installation--setup)
- [Running the Server](#running-the-server)
- [API Reference](#api-reference)
  - [Auth & Users](#auth--users)
  - [OTP](#otp)
  - [Spaces](#spaces)
  - [Tickets](#tickets)
- [Password Requirements](#password-requirements)

---

## Features

- **User authentication** — Register with OTP email verification, login with JWT access + refresh tokens
- **Spaces** — Create, read, update, and soft-delete spaces. Each space gets an auto-generated key (e.g. `SA` from "Sample App") used as a prefix for ticket IDs
- **Tickets** — Full CRUD with unique sequential IDs (`SA-1`, `SA-2`, …) that are never recycled after soft delete
- **Status transitions** — Enforced workflow: `open → in_progress → resolved`, with reopen support
- **Search & filter** — Full-text search on title/description, filter by status, priority, severity, assignee
- **Pagination** — Page/limit based with total count metadata
- **Export** — Download tickets as CSV or JSON with active filters applied
- **Ticket stats** — Count of tickets per status for dashboard indicators

---

## Tech Stack

| Layer            | Technology                    |
| ---------------- | ----------------------------- |
| Runtime          | Node.js (ESM)                 |
| Framework        | Express 5                     |
| Database         | MongoDB via Mongoose 9        |
| Auth             | JWT (access + refresh tokens) |
| Validation       | express-validator             |
| Password hashing | bcrypt                        |
| Email (OTP)      | Nodemailer                    |
| Dev server       | Nodemon                       |

---

## Prerequisites

- **Node.js** v18 or later
- **MongoDB** — local instance or [MongoDB Atlas](https://www.mongodb.com/atlas)
- An SMTP email account for sending OTP emails (e.g. Gmail with App Password)

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Server
NODE_ENV=development
APP_PORT=5000
API_BASE_URL=/api/v1

# MongoDB
MONGODB_URL=mongodb://localhost:27017/issue-tracker

# JWT secrets — use long random strings, keep them different
SERVER_SECRET=your_access_token_secret_here
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here

# CORS — comma-separated list of allowed frontend origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Email (for OTP)
SENDER_EMAIL_ADDRESS=your_email@gmail.com
SENDER_EMAIL_PASSWORD=your_app_password_here
```

> **Security note:** Never commit `.env` to version control. Add it to `.gitignore`.

---

## Installation & Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd issue-tracker-backend

# 2. Install dependencies
npm install

# 3. Create your .env file (see above)
cp .env.example .env   # edit with your values
```

---

## Running the Server

```bash
# Development (auto-restarts on file changes)
npm start

# The server will start on http://localhost:5000 (or your APP_PORT)
```

---

## API Reference

All routes are prefixed with `API_BASE_URL` (e.g. `/api/v1`).

Protected routes require:

```
Authorization: Bearer <access_token>
```

---

### Auth & Users

| Method | Path                   | Auth | Description                                 |
| ------ | ---------------------- | ---- | ------------------------------------------- |
| `POST` | `/users`               | No   | Register new user (requires OTP)            |
| `POST` | `/users/sign-in`       | No   | Login, returns access + refresh tokens      |
| `POST` | `/users/refresh-token` | No   | Exchange refresh token for new access token |

**Register — `POST /users`**

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "StrongPass1!",
  "otp": "123456"
}
```

**Sign In — `POST /users/sign-in`**

```json
{
  "email": "alice@example.com",
  "password": "StrongPass1!"
}
```

Response includes `token` (access) and `refreshToken`.

**Refresh Token — `POST /users/refresh-token`**

Pass the refresh token in the `Refresh-Token` request header (not the request body).

Example (curl):

```bash
curl -X POST "http://localhost:5000/api/v1/users/refresh-token" \
  -H "Refresh-Token: <refresh_token>"
```

Response includes a new access `token` and a new `refreshToken`:

```json
{
  "token": "<new_access_token>",
  "refreshToken": "<new_refresh_token>"
}
```

---

### OTP

| Method | Path            | Auth | Description                           |
| ------ | --------------- | ---- | ------------------------------------- |
| `POST` | `/otp/send-otp` | No   | Send a 6-digit OTP to the given email |

**Send OTP — `POST /otp/send-otp`**

```json
{
  "email": "alice@example.com"
}
```

OTPs expire after **5 minutes** and are consumed on use.

---

### Spaces

| Method   | Path         | Auth        | Description                    |
| -------- | ------------ | ----------- | ------------------------------ |
| `POST`   | `/spaces`    | Yes         | Create a new space             |
| `GET`    | `/spaces`    | Yes         | List all active spaces         |
| `GET`    | `/spaces/:id` | Yes        | Get a single space             |
| `PUT`    | `/spaces/:id` | Yes (owner) | Update space name/description  |
| `DELETE` | `/spaces/:id` | Yes (owner) | Soft-delete a space            |

**Create Space — `POST /spaces`**

```json
{
  "name": "Sample App",
  "description": "Optional description"
}
```

Response includes the auto-generated `spaceKey` (e.g. `"SA"`).

---

### Tickets

All ticket routes are nested under a space: `/spaces/:spaceId/tickets`

| Method   | Path                                          | Auth | Description                             |
| -------- | --------------------------------------------- | ---- | --------------------------------------- |
| `GET`    | `/spaces/:spaceId/tickets/stats`              | Yes  | Count tickets by status                 |
| `GET`    | `/spaces/:spaceId/tickets/export`             | Yes  | Export tickets as CSV or JSON           |
| `POST`   | `/spaces/:spaceId/tickets`                    | Yes  | Create a ticket                         |
| `GET`    | `/spaces/:spaceId/tickets`                    | Yes  | List tickets (filter, search, paginate) |
| `GET`    | `/spaces/:spaceId/tickets/:ticketId`          | Yes  | Get ticket details (e.g. `SA-1`)        |
| `PUT`    | `/spaces/:spaceId/tickets/:ticketId`          | Yes  | Update ticket fields                    |
| `PATCH`  | `/spaces/:spaceId/tickets/:ticketId/status`   | Yes  | Transition ticket status                |
| `DELETE` | `/spaces/:spaceId/tickets/:ticketId`          | Yes  | Soft-delete a ticket                    |

**Create Ticket — `POST /spaces/:spaceId/tickets`**

```json
{
  "title": "Login page crashes on Safari",
  "description": "Detailed reproduction steps here",
  "priority": "high",
  "severity": "critical",
  "assignee": "64abc..."
}
```

Priority/severity values: `low`, `medium`, `high`, `critical`  
Defaults: `priority = medium`, `severity = medium`

**List Tickets — `GET /spaces/:spaceId/tickets`**

All query parameters are optional:

| Parameter    | Type    | Description                                                |
| ------------ | ------- | ---------------------------------------------------------- |
| `page`       | integer | Page number (default: 1)                                   |
| `limit`      | integer | Results per page, max 100 (default: 20)                    |
| `search`     | string  | Full-text search on title and description                  |
| `status`     | string  | Filter: `open`, `in_progress`, `resolved`                  |
| `priority`   | string  | Filter: `low`, `medium`, `high`, `critical`                |
| `severity`   | string  | Filter: `low`, `medium`, `high`, `critical`                |
| `assignee`   | string  | Filter by assignee's MongoDB ObjectId                      |
| `sortBy`     | string  | `ticketId` (default), `priority`, `createdAt`, `updatedAt` |
| `sortOrder`  | string  | `asc` (default) or `desc`                                  |

> **Performance tip:** Debounce the `search` parameter on the frontend (300–500ms) to avoid unnecessary API calls during typing.

Example: `GET /api/v1/spaces/64abc.../tickets?status=open&priority=high&sortBy=priority&sortOrder=desc&page=1&limit=20`

**Update Status — `PATCH /spaces/:spaceId/tickets/:ticketId/status`**

```json
{
  "status": "in_progress"
}
```

Allowed transitions:

- `open` → `in_progress`
- `in_progress` → `resolved` or `open` (reopen)
- `resolved` → `open` (reopen)

**Export Tickets — `GET /spaces/:spaceId/tickets/export`**

| Parameter | Description               |
| --------- | ------------------------- |
| `format`  | `json` (default) or `csv` |

All filter parameters from the list endpoint also apply.

Example: `GET /api/v1/spaces/64abc.../tickets/export?format=csv&status=resolved`

**Ticket Stats — `GET /spaces/:spaceId/tickets/stats`**

Response:

```json
{
  "open": 12,
  "in_progress": 5,
  "resolved": 43,
  "total": 60
}
```

---

## Password Requirements

Passwords must be at least 8 characters long and contain:

- At least one **uppercase letter** (A–Z)
- At least one **lowercase letter** (a–z)
- At least one **number** (0–9)
- At least one **special character** (e.g. `!@#$%^&*`)

Example valid password: `MyPass1!`
