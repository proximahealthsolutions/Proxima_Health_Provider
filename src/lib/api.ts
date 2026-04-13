export const API_URL = "/api";

function extractApiErrorMessage(data: any) {
  if (!data) return null;
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  if (Array.isArray(data.message) && data.message.length > 0) {
    return data.message
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  return null;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(extractApiErrorMessage(data) || "Something went wrong");
  }

  return data;
}
