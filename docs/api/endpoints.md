# API Documentation

## Authentication Module 

- Base URL: `/api/v1/auth`

| Description | Method | Full URL | Required Role | Bearer JWT Required? | Expected Status | Parameters |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Register User** | `POST` | `/api/v1/auth/register` | `None` | No | `201` | **Body:** `username`, `email`, `password` |
| **Verify Email** | `POST` | `/api/v1/auth/verify-email` | `None` | No | `204` | **Body:** `email`, `code` |
| **Resend Code** | `POST` | `/api/v1/auth/resend-code` | `None` | No | `204` | **Body:** `email` |
| **Forgot Password** | `POST` | `/api/v1/auth/forgot-password` | `None` | No | `204` | **Body:** `email` |
| **Reset Password** | `POST` | `/api/v1/auth/reset-password` | `None` | No | `204` | **Body:** `email`, `code`, `newPassword`, `confirmPassword` |
| **Login User** | `POST` | `/api/v1/auth/login` | `None` | No | `200` | **Body:** `email`, `password` |
| **Refresh Token** | `POST` | `/api/v1/auth/refresh` | `None` | No | `200` | **Body:** `refreshToken` |
| **Logout User** | `POST` | `/api/v1/auth/logout` | `None` | No | `204` | **Body:** `refreshToken` |
| **Current User Profile** | `GET` | `/api/v1/auth/me` | `Authenticated` | Yes | `200` | **None** |
| **Get All Users** | `GET` | `/api/v1/auth/users` | `ADMIN` | Yes | `200` | **Query params:** `page`, `size`, `sort` |
| **Deactivate User Account** | `PATCH` | `/api/v1/auth/users/{targetId}/deactivate` | `ADMIN` | Yes | `204` | **Path param:** `targetId` |

## Device Module 

- Base URL: `/api/v1`


| Description | Method | Full URL | Required Role | Bearer JWT Required? | Expected Status | Parameters |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Register Factory Device** | `POST` | `/api/v1/factory/devices` | `FACTORY` | Yes | `200` | **Body:** `deviceId`, `claimSecret` |
| **Create Device Pairing** | `POST` | `/api/v1/device-pairings` | `Authenticated` | Yes | `200` | **Body:** `deviceId` |
| **Get Pairing Status** | `GET` | `/api/v1/device-pairings/{pairingId}` | `Authenticated` | Yes | `200` | **Path param:** `pairingId` |
| **Cancel Pairing Request** | `DELETE` | `/api/v1/device-pairings/{pairingId}` | `Authenticated` | Yes | `204` | **Path param:** `pairingId` |
| **Claim Device** | `POST` | `/api/v1/device-claims/claim` | `None` | No | `200` | **Body:** `deviceId`, `claimSecret`, `pairingToken` |
| **Get My Devices** | `GET` | `/api/v1/devices/my` | `Authenticated` | Yes | `200` | **Query params:** `page`, `size`, `sort` |
| **Get Device By Id** | `GET` | `/api/v1/devices/{deviceId}` | `Authenticated` | Yes | `200` | **Path param:** `deviceId` |
| **Get Latest Measurement** | `GET` | `/api/v1/devices/{deviceId}/measurements/latest` | `Authenticated` | Yes | `200` | **Path param:** `deviceId` |
| **Get Device Measurements** | `GET` | `/api/v1/devices/{deviceId}/measurements` | `Authenticated` | Yes | `200` | **Path param:** `deviceId`, **Query param:** `limit` (default: `120`) |

## Relative Module 

- Base URL: `/api/v1/relatives`

| Description | Method | Full URL | Required Role | Bearer JWT Required? | Expected Status | Parameters |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Invite Relative** | `POST` | `/api/v1/relatives/invitations` | `USER`, `RELATIVE` | Yes | `201` | **Body:** `username` |
| **Get My Relatives** | `GET` | `/api/v1/relatives` | `USER`, `RELATIVE` | Yes | `200` | **Query params:** `page`, `size`, `sort` |
| **Remove Relative / Cancel Invitation** | `DELETE` | `/api/v1/relatives/{relativeId}` | `USER`, `RELATIVE` | Yes | `204` | **Path param:** `relativeId` |
| **Get My Invitations** | `GET` | `/api/v1/relatives/invitations` | `USER`, `RELATIVE` | Yes | `200` | **Query params:** `page`, `size`, `sort` |
| **Accept Invitation** (returns new `accessToken` and `refreshToken`) | `POST` | `/api/v1/relatives/invitations/{invitationId}/accept` | `USER`, `RELATIVE` | Yes | `200` | **Path param:** `invitationId` |
| **Decline Invitation** | `POST` | `/api/v1/relatives/invitations/{invitationId}/decline` | `USER`, `RELATIVE` | Yes | `204` | **Path param:** `invitationId` |
| **Get Linked Users** | `GET` | `/api/v1/relatives/users` | `RELATIVE` | Yes | `200` | **Query params:** `page`, `size`, `sort` |
| **Unlink User** | `DELETE` | `/api/v1/relatives/users/{userId}` | `RELATIVE` | Yes | `204` | **Path param:** `userId` |
| **Get All Linked Users' Devices** | `GET` | `/api/v1/relatives/devices` | `RELATIVE` | Yes | `200` | **Query params:** `page`, `size`, `sort` |
| **Get Linked User's Devices** | `GET` | `/api/v1/relatives/users/{userId}/devices` | `RELATIVE` | Yes | `200` | **Path param:** `userId`, **Query params:** `page`, `size`, `sort` |
| **Get Linked User's Device By Id** | `GET` | `/api/v1/relatives/users/{userId}/devices/{deviceId}` | `RELATIVE` | Yes | `200` | **Path params:** `userId`, `deviceId` |
| **Get Linked User's Latest Measurement** | `GET` | `/api/v1/relatives/users/{userId}/devices/{deviceId}/measurements/latest` | `RELATIVE` | Yes | `200` | **Path params:** `userId`, `deviceId` |
| **Get Linked User's Device Measurements** | `GET` | `/api/v1/relatives/users/{userId}/devices/{deviceId}/measurements` | `RELATIVE` | Yes | `200` | **Path params:** `userId`, `deviceId`, **Query param:** `limit` (default: `120`) |
