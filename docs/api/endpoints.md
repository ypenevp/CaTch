# API Documentation

## Authentication Module 

- Base URL: `/api/v1/auth`

| Description | Method | Full URL | Required Role | Bearer JWT Required? | Expected Status | Parameters |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Register User** | `POST` | `/api/v1/auth/register` | `USER` | No | `201` | **Body:** `username`, `email`, `password` |
| **Verify Email** | `POST` | `/api/v1/auth/verify-email` | `USER` | No | `204` | **Body:** `email`, `code` |
| **Resend Code** | `POST` | `/api/v1/auth/resend-code` | `USER` | No | `204` | **Body:** `email` |
| **Login User** | `POST` | `/api/v1/auth/login` | `USER` | No | `200` | **Body:** `email`, `password` |
| **Refresh Token** | `POST` | `/api/v1/auth/refresh` | `USER` | No | `200` | **Body:** `refreshToken` |
| **Logout User** | `POST` | `/api/v1/auth/logout` | `USER` | No | `204` | **Body:** `refreshToken` |
| **Current User Profile** | `GET` | `/api/v1/auth/me` | `USER` | Yes | `200` | **None** |
| **Get All Users** | `GET` | `/api/v1/auth/users` | `ADMIN` | Yes | `200` | **Query params:** `page`, `size`, `sort` |