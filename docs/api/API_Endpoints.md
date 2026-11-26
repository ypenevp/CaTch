# CaTch REST API

REST API of the CaTch Spring Boot backend.

**Jump to:** [General Conventions](#general-conventions) · [Authentication](#authentication) · [Devices](#devices) · [Device Statistics](#device-statistics) · [AI Analysis](#ai-analysis) · [Device Pairing](#device-pairing) · [Device Claim](#device-claim) · [Factory Devices](#factory-devices) · [Relatives](#relatives) · [Relative Devices](#relative-devices) · [Notifications](#notifications)

---

## General Conventions

### Host and Port

| Item | Value |
|---|---|
| Base host | `http://127.0.0.1:7070` |
| Port setting | `server.port=${SPRING_PORT}` (`server/.env`) |

### API Base Path

| Item | Value |
|---|---|
| Prefix | `/api/v1` |
| Full base URL | `http://127.0.0.1:7070/api/v1` |
| Body format | JSON |
| Timestamps | ISO-8601 UTC, e.g. `2026-11-26T09:30:00Z` |

### Roles

| Role | Rights |
|---|---|
| `USER` | Default role of a new account. Owns bracelets, reads their data, invites relatives, receives notifications. |
| `RELATIVE` | A user who accepted an invitation. Keeps the `USER` rights and reads the bracelets of the users who invited them. |
| `ADMIN` | Lists users and deactivates accounts. |
| `FACTORY` | Registers new, unclaimed bracelets. |

### Authentication

| Item | Value |
|---|---|
| Header | `Authorization: Bearer <accessToken>` |
| Access token | JWT, `sub` = user id, claim `role`, valid 1 hour |
| Refresh token | UUID, valid `REFRESH_EXPIRES_DAYS` days, replaced on every login and refresh |
| Obtained from | `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh` |

Public endpoints (no JWT):

- `POST /api/v1/auth/register`, `/verify-email`, `/login`, `/refresh`, `/resend-code`, `/logout`, `/forgot-password`, `/reset-password`
- `POST /api/v1/device-claims/claim`

### Pagination

Paginated endpoints accept `page` (0-based), `size` and `sort` (`field,asc|desc`) as query parameters and return a Spring `Page`:

```json
{
  "content": [],
  "pageable": { "pageNumber": 0, "pageSize": 20, "sort": { "empty": false, "sorted": true, "unsorted": false }, "offset": 0, "paged": true, "unpaged": false },
  "last": true,
  "totalElements": 0,
  "totalPages": 0,
  "size": 20,
  "number": 0,
  "sort": { "empty": false, "sorted": true, "unsorted": false },
  "first": true,
  "numberOfElements": 0,
  "empty": true
}
```

The examples in the modules leave out `pageable` and `sort`.

### Error Responses

General error:

```json
{
  "status": 404,
  "error": "Not Found",
  "message": "Device not found",
  "timestamp": "2026-11-26T09:30:00Z",
  "path": "/api/v1/devices/catch-001"
}
```

Validation error (`fieldErrors` holds one message per invalid field, `message` is always `"Validation failed"`):

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "fieldErrors": { "email": "must be a well-formed email address" },
  "timestamp": "2026-11-26T09:30:00Z",
  "path": "/api/v1/auth/login"
}
```

---

## Authentication

Registration with email verification, login with JWT and refresh token, password reset and admin user management.

**Base URL:** `/api/v1/auth`

### Endpoints Overview

| Method | Full Endpoint URL | Description | Success Status |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Creates an account and emails a 6-digit verification code. | `201` |
| `POST` | `/api/v1/auth/verify-email` | Verifies the email with the code. | `204` |
| `POST` | `/api/v1/auth/login` | Logs in and returns an access and a refresh token. | `200` |
| `POST` | `/api/v1/auth/refresh` | Exchanges a refresh token for a new token pair. | `200` |
| `POST` | `/api/v1/auth/logout` | Deletes the refresh token. | `204` |
| `POST` | `/api/v1/auth/resend-code` | Sends a new email verification code. | `204` |
| `POST` | `/api/v1/auth/forgot-password` | Emails a 6-digit password reset code. | `204` |
| `POST` | `/api/v1/auth/reset-password` | Sets a new password with the reset code. | `204` |
| `GET` | `/api/v1/auth/me` | Returns the profile of the current user. | `200` |
| `GET` | `/api/v1/auth/users` | Lists all users. | `200` |
| `PATCH` | `/api/v1/auth/users/{targetId}/deactivate` | Deactivates a user account. | `204` |

### Endpoint Details

| Method | Full Endpoint URL | JWT Required? | Required Role | Paginated? |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | No | None | No |
| `POST` | `/api/v1/auth/verify-email` | No | None | No |
| `POST` | `/api/v1/auth/login` | No | None | No |
| `POST` | `/api/v1/auth/refresh` | No | None | No |
| `POST` | `/api/v1/auth/logout` | No | None | No |
| `POST` | `/api/v1/auth/resend-code` | No | None | No |
| `POST` | `/api/v1/auth/forgot-password` | No | None | No |
| `POST` | `/api/v1/auth/reset-password` | No | None | No |
| `GET` | `/api/v1/auth/me` | Yes | None | No |
| `GET` | `/api/v1/auth/users` | Yes | `ADMIN` | Yes |
| `PATCH` | `/api/v1/auth/users/{targetId}/deactivate` | Yes | `ADMIN` | No |

### Parameters

#### `POST /api/v1/auth/register`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `username` | Body | String | Yes | 2–30 characters, unique. |
| `email` | Body | String | Yes | Valid email, unique. |
| `password` | Body | String | Yes | 8–20 characters. |

**Request format**

```json
{ "username": "maria", "email": "maria@example.com", "password": "secret123" }
```

**Response format**

Empty. Header `Location: /api/v1/auth/login`.

#### `POST /api/v1/auth/verify-email`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `email` | Body | String | Yes | Email of the account. |
| `code` | Body | String | Yes | Exactly 6 digits from the email, valid 5 minutes. |

**Request format**

```json
{ "email": "maria@example.com", "code": "482913" }
```

**Response format**

Empty

#### `POST /api/v1/auth/login`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `email` | Body | String | Yes | Valid email. |
| `password` | Body | String | Yes | Account password. |

**Request format**

```json
{ "email": "maria@example.com", "password": "secret123" }
```

**Response format**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI3Iiwicm9sZSI6IlVTRVIifQ.sig",
  "refreshToken": "0b9f3c1e-6d2a-4f7b-9a51-3c8e2d7f4a10"
}
```

#### `POST /api/v1/auth/refresh`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `refreshToken` | Body | String | Yes | Current refresh token; it stops working after the call. |

**Request format**

```json
{ "refreshToken": "0b9f3c1e-6d2a-4f7b-9a51-3c8e2d7f4a10" }
```

**Response format**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI3Iiwicm9sZSI6IlVTRVIifQ.sig",
  "refreshToken": "5e2a7d90-1c4b-4b8e-8f3a-9d6c2b1e7a44"
}
```

#### `POST /api/v1/auth/logout`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `refreshToken` | Body | String | Yes | Refresh token to delete. |

**Request format**

```json
{ "refreshToken": "5e2a7d90-1c4b-4b8e-8f3a-9d6c2b1e7a44" }
```

**Response format**

Empty

#### `POST /api/v1/auth/resend-code`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `email` | Body | String | Yes | Valid email, max 320 characters. One request per 60 s. |

**Request format**

```json
{ "email": "maria@example.com" }
```

**Response format**

Empty

#### `POST /api/v1/auth/forgot-password`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `email` | Body | String | Yes | Email of an existing account. One request per 60 s. |

**Request format**

```json
{ "email": "maria@example.com" }
```

**Response format**

Empty

#### `POST /api/v1/auth/reset-password`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `email` | Body | String | Yes | Email of the account. |
| `code` | Body | String | Yes | Exactly 6 digits from the reset email. |
| `newPassword` | Body | String | Yes | 8–20 characters. |
| `confirmPassword` | Body | String | Yes | Must equal `newPassword`. |

**Request format**

```json
{ "email": "maria@example.com", "code": "731044", "newPassword": "newSecret1", "confirmPassword": "newSecret1" }
```

**Response format**

Empty

#### `GET /api/v1/auth/me`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |

**Request format**

Empty

**Response format**

```json
{ "id": 7, "username": "maria", "email": "maria@example.com", "active": true }
```

#### `GET /api/v1/auth/users`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>` of an `ADMIN`. |
| `page` | Query | Integer | No | Page number, 0-based. Default `0`. |
| `size` | Query | Integer | No | Page size. Default `20`. |
| `sort` | Query | String | No | Sort field and direction. Default `id,asc`. |

**Request format**

Empty

**Response format**

```json
{
  "content": [
    { "id": 7, "username": "maria", "email": "maria@example.com", "active": true }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true,
  "numberOfElements": 1,
  "empty": false
}
```

#### `PATCH /api/v1/auth/users/{targetId}/deactivate`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>` of an `ADMIN`. |
| `targetId` | Path | Long | Yes | Id of the user to deactivate. |

**Request format**

Empty

**Response format**

Empty

---

## Devices

Read access to the bracelets owned by the current user and their raw measurements. The server keeps the last 120 measurements per bracelet.

**Base URL:** `/api/v1/devices`

### Endpoints Overview

| Method | Full Endpoint URL | Description | Success Status |
|---|---|---|---|
| `GET` | `/api/v1/devices/my` | Lists the bracelets owned by the current user. | `200` |
| `GET` | `/api/v1/devices/{deviceId}` | Returns one owned bracelet with its online status. | `200` |
| `GET` | `/api/v1/devices/{deviceId}/measurements/latest` | Returns the newest measurement of the bracelet. | `200` |
| `GET` | `/api/v1/devices/{deviceId}/measurements` | Returns the newest measurements, newest first. | `200` |

### Endpoint Details

| Method | Full Endpoint URL | JWT Required? | Required Role | Paginated? |
|---|---|---|---|---|
| `GET` | `/api/v1/devices/my` | Yes | None | Yes |
| `GET` | `/api/v1/devices/{deviceId}` | Yes | None | No |
| `GET` | `/api/v1/devices/{deviceId}/measurements/latest` | Yes | None | No |
| `GET` | `/api/v1/devices/{deviceId}/measurements` | Yes | None | No ¹ |

¹ The response has the `Page` structure, but always as the first page sized by `limit`; `page`, `size` and `sort` are not read.

### Parameters

#### `GET /api/v1/devices/my`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `page` | Query | Integer | No | Page number, 0-based. Default `0`. |
| `size` | Query | Integer | No | Page size. Default `20`. |
| `sort` | Query | String | No | Sort field and direction. Default `id,desc`. |

**Request format**

Empty

**Response format**

```json
{
  "content": [
    { "id": 3, "deviceId": "catch-001", "status": "ACTIVE", "online": true, "lastSeen": "2026-11-26T09:30:00Z" }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true,
  "numberOfElements": 1,
  "empty": false
}
```

#### `GET /api/v1/devices/{deviceId}`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `deviceId` | Path | String | Yes | Id of an owned bracelet. |

**Request format**

Empty

**Response format**

```json
{ "id": 3, "deviceId": "catch-001", "status": "ACTIVE", "online": true, "lastSeen": "2026-11-26T09:30:00Z" }
```

`online` is `true` when a measurement arrived in the last 10 seconds; `lastSeen` is `null` when the bracelet never sent data.

#### `GET /api/v1/devices/{deviceId}/measurements/latest`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `deviceId` | Path | String | Yes | Id of an owned bracelet. |

**Request format**

Empty

**Response format**

```json
{
  "measuredAt": "2026-11-26T09:30:00Z",
  "receivedAt": "2026-11-26T09:30:00.150Z",
  "accelX": 0.012, "accelY": -0.034, "accelZ": 0.998,
  "gyroX": 0.5, "gyroY": -1.2, "gyroZ": 0.1,
  "heartRate": 72,
  "spo2": 98.0
}
```

#### `GET /api/v1/devices/{deviceId}/measurements`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `deviceId` | Path | String | Yes | Id of an owned bracelet. |
| `limit` | Query | Integer | No | Number of measurements, clamped to 1–120. Default `120`. |

**Request format**

Empty

**Response format**

```json
{
  "content": [
    {
      "measuredAt": "2026-11-26T09:30:00Z",
      "receivedAt": "2026-11-26T09:30:00.150Z",
      "accelX": 0.012, "accelY": -0.034, "accelZ": 0.998,
      "gyroX": 0.5, "gyroY": -1.2, "gyroZ": 0.1,
      "heartRate": 72,
      "spo2": 98.0
    }
  ],
  "totalElements": 120,
  "totalPages": 120,
  "size": 1,
  "number": 0,
  "first": true,
  "last": false,
  "numberOfElements": 1,
  "empty": false
}
```

---

## Device Statistics

Heart rate and SpO₂ of an owned bracelet aggregated in 10-second buckets, kept for 60 minutes.

**Base URL:** `/api/v1/devices/{deviceId}/statistics`

### Endpoints Overview

| Method | Full Endpoint URL | Description | Success Status |
|---|---|---|---|
| `GET` | `/api/v1/devices/{deviceId}/statistics` | Returns a summary and 10-second points for the last N minutes. | `200` |

### Endpoint Details

| Method | Full Endpoint URL | JWT Required? | Required Role | Paginated? |
|---|---|---|---|---|
| `GET` | `/api/v1/devices/{deviceId}/statistics` | Yes | None | No |

### Parameters

#### `GET /api/v1/devices/{deviceId}/statistics`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `deviceId` | Path | String | Yes | Id of an owned, active bracelet. |
| `minutes` | Query | Integer | No | Window length, 1–60. Default `10`. |

**Request format**

Empty

**Response format**

```json
{
  "deviceId": "catch-001",
  "from": "2026-11-26T09:20:00Z",
  "to": "2026-11-26T09:30:00Z",
  "bucketSeconds": 10,
  "heartRate": { "min": 64.0, "average": 72.4, "max": 81.0, "samples": 600 },
  "spo2": { "min": 96.0, "average": 97.8, "max": 99.0, "samples": 600 },
  "points": [
    {
      "start": "2026-11-26T09:29:50Z",
      "end": "2026-11-26T09:30:00Z",
      "heartRateAverage": 73.1,
      "spo2Average": 98.0,
      "heartRateSamples": 10,
      "spo2Samples": 10
    }
  ]
}
```

---

## AI Analysis

Activity and fall detection results that the AI service produced for an owned bracelet.

**Base URL:** `/api/v1/devices/{deviceId}/analyses`

### Endpoints Overview

| Method | Full Endpoint URL | Description | Success Status |
|---|---|---|---|
| `GET` | `/api/v1/devices/{deviceId}/analyses` | Lists the analyses of the bracelet, newest first. | `200` |
| `GET` | `/api/v1/devices/{deviceId}/analyses/latest` | Returns the newest analysis of the bracelet. | `200` |

### Endpoint Details

| Method | Full Endpoint URL | JWT Required? | Required Role | Paginated? |
|---|---|---|---|---|
| `GET` | `/api/v1/devices/{deviceId}/analyses` | Yes | None | Yes |
| `GET` | `/api/v1/devices/{deviceId}/analyses/latest` | Yes | None | No |

### Parameters

#### `GET /api/v1/devices/{deviceId}/analyses`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `deviceId` | Path | String | Yes | Id of an owned bracelet. |
| `fallsOnly` | Query | Boolean | No | `true` returns only analyses with a detected fall. Default `false`. |
| `page` | Query | Integer | No | Page number, 0-based. Default `0`. |
| `size` | Query | Integer | No | Page size. Default `20`. |
| `sort` | Query | String | No | Sort field and direction. Default `id,desc`. |

**Request format**

Empty

**Response format**

```json
{
  "content": [
    {
      "id": 512,
      "deviceId": "catch-001",
      "activity": "fall",
      "fallDetected": true,
      "fallProbability": 0.93,
      "fallCause": "no_heart_rate_indicator",
      "fallReason": "Heart rate before the fall was in range (88 BPM).",
      "heartRate": 88,
      "windowStartAt": "2026-11-26T09:28:45Z",
      "windowEndAt": "2026-11-26T09:30:00Z",
      "analyzedAt": "2026-11-26T09:30:01Z"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true,
  "numberOfElements": 1,
  "empty": false
}
```

| Field | Values |
|---|---|
| `activity` | `still`, `walking`, `stairs`, `sit_stand_transition`, `lie_getup_transition`, `tying_shoe`, `sensor_hit`, `fall` |
| `fallCause` | `possible_health_cause`, `no_heart_rate_indicator`, `unknown`, or `null` without a fall |
| `fallReason` | Text from the AI service, or `null` without a fall |

#### `GET /api/v1/devices/{deviceId}/analyses/latest`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `deviceId` | Path | String | Yes | Id of an owned bracelet. |

**Request format**

Empty

**Response format**

```json
{
  "id": 513,
  "deviceId": "catch-001",
  "activity": "walking",
  "fallDetected": false,
  "fallProbability": 0.02,
  "fallCause": null,
  "fallReason": null,
  "heartRate": 76,
  "windowStartAt": "2026-11-26T09:29:20Z",
  "windowEndAt": "2026-11-26T09:30:35Z",
  "analyzedAt": "2026-11-26T09:30:36Z"
}
```

---

## Device Pairing

The app creates a pairing for an unclaimed bracelet; the returned `pairingToken` is passed to the bracelet, which claims itself within 10 minutes.

**Base URL:** `/api/v1/device-pairings`

### Endpoints Overview

| Method | Full Endpoint URL | Description | Success Status |
|---|---|---|---|
| `POST` | `/api/v1/device-pairings` | Creates a pairing and returns its one-time token. | `200` |
| `GET` | `/api/v1/device-pairings/{pairingId}` | Returns the status of a pairing created by the current user. | `200` |
| `DELETE` | `/api/v1/device-pairings/{pairingId}` | Cancels (deletes) a pending pairing. | `204` |

### Endpoint Details

| Method | Full Endpoint URL | JWT Required? | Required Role | Paginated? |
|---|---|---|---|---|
| `POST` | `/api/v1/device-pairings` | Yes | None | No |
| `GET` | `/api/v1/device-pairings/{pairingId}` | Yes | None | No |
| `DELETE` | `/api/v1/device-pairings/{pairingId}` | Yes | None | No |

### Parameters

#### `POST /api/v1/device-pairings`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `deviceId` | Body | String | Yes | Unclaimed bracelet id, matches `^[A-Za-z0-9_-]{8,64}$`. |

**Request format**

```json
{ "deviceId": "catch-001" }
```

**Response format**

```json
{
  "pairingId": "6f1d2c3b-8a4e-4f7d-9b2a-1c0e5d7f3a91",
  "deviceId": "catch-001",
  "pairingToken": "9c4e1f0a7b3d52e8c6a1f4b9d0e7c2a5b8f3d6e1a4c7b0f9e2d5a8c1b4e7f0a3",
  "status": "PENDING",
  "expiresAt": "2026-11-26T09:40:00Z"
}
```

#### `GET /api/v1/device-pairings/{pairingId}`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `pairingId` | Path | UUID | Yes | Id of a pairing created by the current user. |

**Request format**

Empty

**Response format**

```json
{
  "pairingId": "6f1d2c3b-8a4e-4f7d-9b2a-1c0e5d7f3a91",
  "deviceId": "catch-001",
  "pairingToken": null,
  "status": "PAIRED",
  "expiresAt": "2026-11-26T09:40:00Z"
}
```

`status` is `PENDING` or `PAIRED`; an expired pairing stays `PENDING`, so compare `expiresAt` with the current time.

#### `DELETE /api/v1/device-pairings/{pairingId}`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `pairingId` | Path | UUID | Yes | Id of a pairing created by the current user. |

**Request format**

Empty

**Response format**

Empty

---

## Device Claim

Called by the bracelet, not by the app: it sends its factory claim secret and the pairing token to bind itself to the user who created the pairing.

**Base URL:** `/api/v1/device-claims`

### Endpoints Overview

| Method | Full Endpoint URL | Description | Success Status |
|---|---|---|---|
| `POST` | `/api/v1/device-claims/claim` | Binds an unclaimed bracelet to the owner of a pending pairing. | `200` |

### Endpoint Details

| Method | Full Endpoint URL | JWT Required? | Required Role | Paginated? |
|---|---|---|---|---|
| `POST` | `/api/v1/device-claims/claim` | No | None | No |

### Parameters

#### `POST /api/v1/device-claims/claim`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `deviceId` | Body | String | Yes | Bracelet id. |
| `claimSecret` | Body | String | Yes | Factory secret of the bracelet. |
| `pairingToken` | Body | String | Yes | Token from `POST /api/v1/device-pairings`. |

**Request format**

```json
{
  "deviceId": "catch-001",
  "claimSecret": "factory-secret-0001",
  "pairingToken": "9c4e1f0a7b3d52e8c6a1f4b9d0e7c2a5b8f3d6e1a4c7b0f9e2d5a8c1b4e7f0a3"
}
```

**Response format**

```json
{ "deviceId": "catch-001", "status": "ACTIVE" }
```

---

## Factory Devices

Registers new bracelets as `UNCLAIMED` with a claim secret, which is stored as a SHA-256 hash.

**Base URL:** `/api/v1/factory/devices`

### Endpoints Overview

| Method | Full Endpoint URL | Description | Success Status |
|---|---|---|---|
| `POST` | `/api/v1/factory/devices` | Registers a new unclaimed bracelet. | `200` |

### Endpoint Details

| Method | Full Endpoint URL | JWT Required? | Required Role | Paginated? |
|---|---|---|---|---|
| `POST` | `/api/v1/factory/devices` | Yes | `FACTORY` | No |

### Parameters

#### `POST /api/v1/factory/devices`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>` of a `FACTORY` account. |
| `deviceId` | Body | String | Yes | New, unique bracelet id, matches `^[A-Za-z0-9_-]{8,64}$`. |
| `claimSecret` | Body | String | Yes | 16–256 characters. |

**Request format**

```json
{ "deviceId": "catch-001", "claimSecret": "factory-secret-0001" }
```

**Response format**

```json
{ "id": 3, "deviceId": "catch-001", "status": "UNCLAIMED" }
```

---

## Relatives

Invitations between users. Accepting an invitation makes the invited user a `RELATIVE` with read access to the inviter's bracelets.

**Base URL:** `/api/v1/relatives`

### Endpoints Overview

| Method | Full Endpoint URL | Description | Success Status |
|---|---|---|---|
| `POST` | `/api/v1/relatives/invitations` | Invites a user to become a relative. | `201` |
| `GET` | `/api/v1/relatives` | Lists the relatives and pending invitations sent by the current user. | `200` |
| `DELETE` | `/api/v1/relatives/{relativeId}` | Cancels an invitation or removes a relative. | `204` |
| `GET` | `/api/v1/relatives/invitations` | Lists pending invitations received by the current user. | `200` |
| `POST` | `/api/v1/relatives/invitations/{invitationId}/accept` | Accepts an invitation and returns new tokens with the updated role. | `200` |
| `POST` | `/api/v1/relatives/invitations/{invitationId}/decline` | Declines (deletes) an invitation. | `204` |
| `GET` | `/api/v1/relatives/users` | Lists the users the current relative is linked to. | `200` |
| `DELETE` | `/api/v1/relatives/users/{userId}` | Removes the link to a user. | `204` |

### Endpoint Details

| Method | Full Endpoint URL | JWT Required? | Required Role | Paginated? |
|---|---|---|---|---|
| `POST` | `/api/v1/relatives/invitations` | Yes | `USER` or `RELATIVE` | No |
| `GET` | `/api/v1/relatives` | Yes | `USER` or `RELATIVE` | Yes |
| `DELETE` | `/api/v1/relatives/{relativeId}` | Yes | `USER` or `RELATIVE` | No |
| `GET` | `/api/v1/relatives/invitations` | Yes | `USER` or `RELATIVE` | Yes |
| `POST` | `/api/v1/relatives/invitations/{invitationId}/accept` | Yes | `USER` or `RELATIVE` | No |
| `POST` | `/api/v1/relatives/invitations/{invitationId}/decline` | Yes | `USER` or `RELATIVE` | No |
| `GET` | `/api/v1/relatives/users` | Yes | `RELATIVE` | Yes |
| `DELETE` | `/api/v1/relatives/users/{userId}` | Yes | `RELATIVE` | No |

### Parameters

#### `POST /api/v1/relatives/invitations`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `username` | Body | String | Yes | Username of another `USER` or `RELATIVE`. |

**Request format**

```json
{ "username": "ivan" }
```

**Response format**

```json
{ "id": 9, "username": "ivan", "status": "PENDING", "invitedAt": "2026-11-26T09:30:00Z", "acceptedAt": null }
```

`id` is the user id of the invited relative.

#### `GET /api/v1/relatives`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `page` | Query | Integer | No | Page number, 0-based. Default `0`. |
| `size` | Query | Integer | No | Page size. Default `20`. |
| `sort` | Query | String | No | Sort field and direction. Default `id,desc`. |

**Request format**

Empty

**Response format**

```json
{
  "content": [
    { "id": 9, "username": "ivan", "status": "ACCEPTED", "invitedAt": "2026-11-26T09:30:00Z", "acceptedAt": "2026-11-26T09:35:00Z" }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true,
  "numberOfElements": 1,
  "empty": false
}
```

#### `DELETE /api/v1/relatives/{relativeId}`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `relativeId` | Path | Long | Yes | User id of the relative (`id` from `GET /api/v1/relatives`). |

**Request format**

Empty

**Response format**

Empty

#### `GET /api/v1/relatives/invitations`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `page` | Query | Integer | No | Page number, 0-based. Default `0`. |
| `size` | Query | Integer | No | Page size. Default `20`. |
| `sort` | Query | String | No | Sort field and direction. Default `id,desc`. |

**Request format**

Empty

**Response format**

```json
{
  "content": [
    { "id": 14, "fromUserId": 7, "fromUsername": "maria", "invitedAt": "2026-11-26T09:30:00Z" }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true,
  "numberOfElements": 1,
  "empty": false
}
```

`id` is the invitation id used by the accept and decline endpoints.

#### `POST /api/v1/relatives/invitations/{invitationId}/accept`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `invitationId` | Path | Long | Yes | Pending invitation sent to the current user. |

**Request format**

Empty

**Response format**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI5Iiwicm9sZSI6IlJFTEFUSVZFIn0.sig",
  "refreshToken": "a7c3e91d-2f6b-4d8a-b5e0-4c1f9d2a6e83"
}
```

#### `POST /api/v1/relatives/invitations/{invitationId}/decline`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `invitationId` | Path | Long | Yes | Pending invitation sent to the current user. |

**Request format**

Empty

**Response format**

Empty

#### `GET /api/v1/relatives/users`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>` of a `RELATIVE`. |
| `page` | Query | Integer | No | Page number, 0-based. Default `0`. |
| `size` | Query | Integer | No | Page size. Default `20`. |
| `sort` | Query | String | No | Sort field and direction. Default `id,desc`. |

**Request format**

Empty

**Response format**

```json
{
  "content": [
    { "id": 7, "username": "maria", "acceptedAt": "2026-11-26T09:35:00Z" }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true,
  "numberOfElements": 1,
  "empty": false
}
```

`id` is the user id of the linked user.

#### `DELETE /api/v1/relatives/users/{userId}`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>` of a `RELATIVE`. |
| `userId` | Path | Long | Yes | Id of a linked user. |

**Request format**

Empty

**Response format**

Empty

---

## Relative Devices

Read access for a `RELATIVE` to the bracelets of the users who linked them.

**Base URL:** `/api/v1/relatives`

### Endpoints Overview

| Method | Full Endpoint URL | Description | Success Status |
|---|---|---|---|
| `GET` | `/api/v1/relatives/devices` | Lists the bracelets of all linked users with their owner. | `200` |
| `GET` | `/api/v1/relatives/users/{userId}/devices` | Lists the bracelets of one linked user. | `200` |
| `GET` | `/api/v1/relatives/users/{userId}/devices/{deviceId}` | Returns one bracelet of a linked user. | `200` |
| `GET` | `/api/v1/relatives/users/{userId}/devices/{deviceId}/measurements/latest` | Returns the newest measurement of a linked user's bracelet. | `200` |
| `GET` | `/api/v1/relatives/users/{userId}/devices/{deviceId}/measurements` | Returns the newest measurements of a linked user's bracelet. | `200` |

### Endpoint Details

| Method | Full Endpoint URL | JWT Required? | Required Role | Paginated? |
|---|---|---|---|---|
| `GET` | `/api/v1/relatives/devices` | Yes | `RELATIVE` | Yes |
| `GET` | `/api/v1/relatives/users/{userId}/devices` | Yes | `RELATIVE` | Yes |
| `GET` | `/api/v1/relatives/users/{userId}/devices/{deviceId}` | Yes | `RELATIVE` | No |
| `GET` | `/api/v1/relatives/users/{userId}/devices/{deviceId}/measurements/latest` | Yes | `RELATIVE` | No |
| `GET` | `/api/v1/relatives/users/{userId}/devices/{deviceId}/measurements` | Yes | `RELATIVE` | No ¹ |

¹ The response has the `Page` structure, but always as the first page sized by `limit`.

### Parameters

#### `GET /api/v1/relatives/devices`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>` of a `RELATIVE`. |
| `page` | Query | Integer | No | Page number, 0-based. Default `0`. |
| `size` | Query | Integer | No | Page size. Default `20`. |
| `sort` | Query | String | No | Sort field and direction. Default `id,desc`. |

**Request format**

Empty

**Response format**

```json
{
  "content": [
    {
      "ownerId": 7,
      "ownerUsername": "maria",
      "device": { "id": 3, "deviceId": "catch-001", "status": "ACTIVE", "online": true, "lastSeen": "2026-11-26T09:30:00Z" }
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true,
  "numberOfElements": 1,
  "empty": false
}
```

#### `GET /api/v1/relatives/users/{userId}/devices`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>` of a `RELATIVE`. |
| `userId` | Path | Long | Yes | Id of a linked user. |
| `page` | Query | Integer | No | Page number, 0-based. Default `0`. |
| `size` | Query | Integer | No | Page size. Default `20`. |
| `sort` | Query | String | No | Sort field and direction. Default `id,desc`. |

**Request format**

Empty

**Response format**

```json
{
  "content": [
    { "id": 3, "deviceId": "catch-001", "status": "ACTIVE", "online": true, "lastSeen": "2026-11-26T09:30:00Z" }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true,
  "numberOfElements": 1,
  "empty": false
}
```

#### `GET /api/v1/relatives/users/{userId}/devices/{deviceId}`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>` of a `RELATIVE`. |
| `userId` | Path | Long | Yes | Id of a linked user. |
| `deviceId` | Path | String | Yes | Bracelet id owned by that user. |

**Request format**

Empty

**Response format**

```json
{ "id": 3, "deviceId": "catch-001", "status": "ACTIVE", "online": true, "lastSeen": "2026-11-26T09:30:00Z" }
```

#### `GET /api/v1/relatives/users/{userId}/devices/{deviceId}/measurements/latest`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>` of a `RELATIVE`. |
| `userId` | Path | Long | Yes | Id of a linked user. |
| `deviceId` | Path | String | Yes | Bracelet id owned by that user. |

**Request format**

Empty

**Response format**

```json
{
  "measuredAt": "2026-11-26T09:30:00Z",
  "receivedAt": "2026-11-26T09:30:00.150Z",
  "accelX": 0.012, "accelY": -0.034, "accelZ": 0.998,
  "gyroX": 0.5, "gyroY": -1.2, "gyroZ": 0.1,
  "heartRate": 72,
  "spo2": 98.0
}
```

#### `GET /api/v1/relatives/users/{userId}/devices/{deviceId}/measurements`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>` of a `RELATIVE`. |
| `userId` | Path | Long | Yes | Id of a linked user. |
| `deviceId` | Path | String | Yes | Bracelet id owned by that user. |
| `limit` | Query | Integer | No | Number of measurements, clamped to 1–120. Default `120`. |

**Request format**

Empty

**Response format**

```json
{
  "content": [
    {
      "measuredAt": "2026-11-26T09:30:00Z",
      "receivedAt": "2026-11-26T09:30:00.150Z",
      "accelX": 0.012, "accelY": -0.034, "accelZ": 0.998,
      "gyroX": 0.5, "gyroY": -1.2, "gyroZ": 0.1,
      "heartRate": 72,
      "spo2": 98.0
    }
  ],
  "totalElements": 120,
  "totalPages": 120,
  "size": 1,
  "number": 0,
  "first": true,
  "last": false,
  "numberOfElements": 1,
  "empty": false
}
```

---

## Notifications

Fall alerts for the bracelet owner and accepted relatives (AI fall probability ≥ 0.75, one per bracelet per 60 s), and registration of FCM push tokens.

**Base URL:** `/api/v1/notifications`

### Endpoints Overview

| Method | Full Endpoint URL | Description | Success Status |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | Lists the notifications of the current user, newest first. | `200` |
| `GET` | `/api/v1/notifications/unread-count` | Returns the number of unread notifications. | `200` |
| `PATCH` | `/api/v1/notifications/{notificationId}/read` | Marks a notification as read. | `200` |
| `POST` | `/api/v1/notifications/push-tokens` | Registers or reactivates an FCM push token for the current user. | `204` |
| `DELETE` | `/api/v1/notifications/push-tokens` | Deactivates a push token of the current user. | `204` |

### Endpoint Details

| Method | Full Endpoint URL | JWT Required? | Required Role | Paginated? |
|---|---|---|---|---|
| `GET` | `/api/v1/notifications` | Yes | None | Yes |
| `GET` | `/api/v1/notifications/unread-count` | Yes | None | No |
| `PATCH` | `/api/v1/notifications/{notificationId}/read` | Yes | None | No |
| `POST` | `/api/v1/notifications/push-tokens` | Yes | None | No |
| `DELETE` | `/api/v1/notifications/push-tokens` | Yes | None | No |

### Parameters

#### `GET /api/v1/notifications`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `page` | Query | Integer | No | Page number, 0-based. Default `0`. |
| `size` | Query | Integer | No | Page size. Default `20`. |
| `sort` | Query | String | No | Sort field and direction. Default `createdAt,desc`. |

**Request format**

Empty

**Response format**

```json
{
  "content": [
    {
      "id": 41,
      "type": "FALL_DETECTED",
      "title": "Possible fall detected",
      "message": "Possible fall detected for catch-001",
      "deviceId": "catch-001",
      "aiAnalysisId": 512,
      "fallProbability": 0.93,
      "detectedAt": "2026-11-26T09:30:01Z",
      "readAt": null,
      "createdAt": "2026-11-26T09:30:01Z"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true,
  "numberOfElements": 1,
  "empty": false
}
```

#### `GET /api/v1/notifications/unread-count`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |

**Request format**

Empty

**Response format**

```json
{ "unreadCount": 3 }
```

#### `PATCH /api/v1/notifications/{notificationId}/read`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `notificationId` | Path | Long | Yes | Notification of the current user; an existing `readAt` is kept. |

**Request format**

Empty

**Response format**

```json
{
  "id": 41,
  "type": "FALL_DETECTED",
  "title": "Possible fall detected",
  "message": "Possible fall detected for catch-001",
  "deviceId": "catch-001",
  "aiAnalysisId": 512,
  "fallProbability": 0.93,
  "detectedAt": "2026-11-26T09:30:01Z",
  "readAt": "2026-11-26T09:31:10Z",
  "createdAt": "2026-11-26T09:30:01Z"
}
```

#### `POST /api/v1/notifications/push-tokens`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `token` | Body | String | Yes | FCM registration token, max 512 characters. |
| `platform` | Body | String (enum) | Yes | `ANDROID`, `IOS` or `WEB`. |
| `deviceName` | Body | String | No | Phone name, max 128 characters. |

**Request format**

```json
{ "token": "fcm-registration-token", "platform": "ANDROID", "deviceName": "Pixel 8" }
```

**Response format**

Empty

#### `DELETE /api/v1/notifications/push-tokens`

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `Authorization` | Header | String | Yes | `Bearer <accessToken>`. |
| `token` | Body | String | Yes | Push token to deactivate. |

**Request format**

```json
{ "token": "fcm-registration-token" }
```

**Response format**

Empty
