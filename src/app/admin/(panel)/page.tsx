import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin-panel";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/admin-guard";
import { listItems, listOrders } from "@/lib/store";
import { logoutAction } from "../actions";

export default async function AdminPage() {
  // hazard: the layout's redirect does not stop this page from rendering into
  // the same response, so without this check the order list (names and phones)
  // would ship in the body of the redirect.
  if (!(await isAdmin())) redirect("/admin/login");
  const [items, orders] = await Promise.all([listItems(), listOrders()]);
  return (
    <main className="flex-1 bg-[var(--foam)]">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <Link
          href="/"
          className="text-sm font-medium text-[var(--ocean)] transition hover:text-[var(--ocean-ink)]"
        >
          ← Ver o site
        </Link>
        <form action={logoutAction} className="float-right">
          <Button type="submit" variant="outline" size="sm">
            Sair
          </Button>
        </form>
        <div className="mt-8">
          <AdminPanel initialItems={items} initialOrders={orders} />
        </div>
      </div>
    </main>
  );
}
