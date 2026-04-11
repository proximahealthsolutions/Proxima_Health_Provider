"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProviderShell from "@/components/provider/Providershell";
import { fetchApi } from "@/lib/api";

export default function ProviderPage() {
  const router = useRouter();

  useEffect(() => {
    async function guard() {
      try {
        await fetchApi("/providers/me");
      } catch {
        localStorage.removeItem("token");
        document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
        router.push("/");
      }
    }
    guard();
  }, [router]);

  return <ProviderShell />;
}
