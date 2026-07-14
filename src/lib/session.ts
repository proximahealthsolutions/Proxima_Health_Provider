"use client";

import { fetchApi } from "./api";

function clearProviderStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("token");
  window.localStorage.removeItem("verificationToken");
  document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
}

export async function logoutProviderSession(redirectTo: string = "/") {
  try {
    await fetchApi("/auth/logout", { method: "POST" });
  } catch (err) {
    console.error("Failed to log out on server:", err);
  }
  clearProviderStorage();
  if (typeof window !== "undefined") {
    window.location.assign(redirectTo);
  }
}
