import useAuthStore from "@/store/AuthStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(data, status) {
  if (data && typeof data === "object") {
    const fieldErrors = data.fieldErrors && Object.entries(data.fieldErrors);
    if (fieldErrors?.length) {
      const [field, message] = fieldErrors[0];
      return `${field}: ${message}`;
    }
    return data.message || data.error || `Request failed (${status}).`;
  }
  if (typeof data === "string" && data.length > 0 && data.length < 200) return data;
  return `Request failed (${status}).`;
}

let refreshPromise = null;
function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = useAuthStore
      .getState()
      .refresh()
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest(path, options = {}, isRetry = false) {
  const { method = "GET", body, auth = true, signal, headers = {} } = options;
  const accessToken = auth ? useAuthStore.getState().user?.accessToken : null;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...headers,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(0, "Network error. Check your connection.");
  }

  if (response.status === 401 && auth && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiRequest(path, options, true);
  }

  const data = await readBody(response);
  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(data, response.status), data);
  }
  return data;
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options) => apiRequest(path, { ...options, method: "POST", body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => apiRequest(path, { ...options, method: "DELETE" }),
};
