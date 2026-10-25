"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Reloads the import list every few seconds while a file is still being read.
export default function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
