"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";

export function AdminLoginForm() {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      if (!res.ok) {
        setError(copy.admin.loginError);
        return;
      }
      router.refresh();
    } catch {
      setError(copy.admin.loginError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800"
      >
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {copy.admin.loginTitle}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {copy.admin.loginSubtitle}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="passphrase"
            className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            {copy.admin.passphraseLabel}
          </label>
          <input
            id="passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-100"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 w-full items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isSubmitting ? copy.admin.loginSubmitting : copy.admin.loginSubmit}
        </button>
      </form>
    </div>
  );
}
