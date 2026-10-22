# API Documentation

## Authentication Module 

- Base URL: `/api/v1/auth`

| Description | Method | Full URL | Required Role | Bearer JWT Required? | Expected Status | Parameters |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Register User** | `POST` | `/api/v1/auth/register` | `USER` | No | `201` | **Body:** `username`, `email`, `password` |
| **Verify Email** | `POST` | `/api/v1/auth/verify-email` | `USER` | No | `204` | **Body:** `email`, `code` |
| **Resend Code** | `POST` | `/api/v1/auth/resend-code` | `USER` | No | `204` | **Body:** `email` |
| **Forgot Password** | `POST` | `/api/v1/auth/forgot-password` | `USER` | No | `204` | **Body:** `email` |
| **Reset Password** | `POST` | `/api/v1/auth/reset-password` | `USER` | No | `204` | **Body:** `email`, `code`, `newPassword` |
| **Login User** | `POST` | `/api/v1/auth/login` | `USER` | No | `200` | **Body:** `email`, `password` |
| **Refresh Token** | `POST` | `/api/v1/auth/refresh` | `USER` | No | `200` | **Body:** `refreshToken` |
| **Logout User** | `POST` | `/api/v1/auth/logout` | `USER` | No | `204` | **Body:** `refreshToken` |
| **Current User Profile** | `GET` | `/api/v1/auth/me` | `USER` | Yes | `200` | **None** |
| **Get All Users** | `GET` | `/api/v1/auth/users` | `ADMIN` | Yes | `200` | **Query params:** `page`, `size`, `sort` |
| **Deactivate User Account** | `PATCH` | `/api/v1/auth/users/{targetId}/deactivate` | `ADMIN` | Yes | `204` | **Path param:** `targetId` |