import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { googleLoginAction } from "../actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center bg-[var(--foam)] px-5 py-24">
      <form
        action={googleLoginAction}
        className="w-full max-w-md space-y-4 rounded-xl border border-[var(--line)] bg-white p-6"
      >
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ocean-ink)]">
            Cadastro de itens
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Área privada. Entre com a conta Google autorizada.
          </p>
        </div>
        {error && (
          <p className="text-sm text-destructive">
            {error === "AccessDenied"
              ? "Este e-mail não tem acesso."
              : "Não foi possível entrar. Tente de novo."}
          </p>
        )}
        <Button type="submit" className="w-full">
          Entrar com Google
        </Button>
      </form>
    </main>
  );
}
