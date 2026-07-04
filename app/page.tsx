import Link from "next/link";
import { copy } from "@/lib/copy";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            {copy.appName}
          </h1>
          <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
            {copy.landing.tagline}
          </p>
          <p className="text-base text-zinc-500 dark:text-zinc-400">
            {copy.landing.description}
          </p>
        </div>

        <div className="flex w-full flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/report"
            className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 px-6 text-base font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300 sm:w-auto"
          >
            {copy.landing.reportCta}
          </Link>
          <Link
            href="/map"
            className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-300 px-6 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900 sm:w-auto"
          >
            {copy.landing.mapCta}
          </Link>
        </div>
      </main>
    </div>
  );
}
