import { api } from "@/services/apiClient";

export const getProfile = async ({ signal } = {}) => {
  return api.get("/api/v1/auth/me", { signal });
};
