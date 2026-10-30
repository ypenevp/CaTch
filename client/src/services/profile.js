import { api } from "@/services/apiClient";

export function getProfile({ signal } = {}) {
  return api.get("/api/v1/auth/me", { signal });
}
