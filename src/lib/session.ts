"use client";

function clearProviderStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("token");
  window.localStorage.removeItem("verificationToken");
  document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
}

export async function logoutProviderSession(redirectTo: string = "/") {
  clearProviderStorage();
  if (typeof window !== "undefined") {
    window.location.assign(redirectTo);
  }
}
