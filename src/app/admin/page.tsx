import Link from "next/link";
import { AdminPanel } from "@/components/admin-panel";

export default function AdminPage() {
  return (
    <main className="flex-1 bg-[var(--foam)]">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <Link
          href="/"
          className="text-sm font-medium text-[var(--ocean)] transition hover:text-[var(--ocean-ink)]"
        >
          ← Ver o site
        </Link>
        <div className="mt-8">
          <AdminPanel />
        </div>
      </div>
    </main>
  );
}
