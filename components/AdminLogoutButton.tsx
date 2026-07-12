"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";

export function AdminLogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (!res.ok) {
        setError(true);
        return;
      }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">
          {copy.admin.logoutError}
        </span>
      )}
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={isLoggingOut}
        className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        {isLoggingOut ? copy.admin.loggingOut : copy.admin.logout}
      </button>
    </div>
  );
}
