"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { takePendingInvite } from "@/lib/invites";

// After someone signs in from an invite link, send them back to it.
export function PendingInvite() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || window.location.pathname.startsWith("/join/")) return;
    const path = takePendingInvite();
    if (path) router.replace(path);
  }, [user, router]);

  return null;
}
