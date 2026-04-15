import Link from "next/link";
import { readSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await readSession();
  if (session) redirect("/dashboard");
  const { error } = await searchParams;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 dark:from-zinc-900 dark:to-black px-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-orange-600">myfitrun</h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Strava と連携して、AI コーチがあなたのランやウォークを評価。
            次の目標と練習メニューを提案します。
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
            ログインに失敗しました: {error}
          </div>
        )}

        <Link
          href="/api/auth/strava/login"
          className="inline-block rounded-full bg-[#FC4C02] hover:bg-[#e34502] text-white font-bold px-8 py-3 transition-colors"
        >
          Strava でログイン
        </Link>

        <p className="text-xs text-zinc-500">Powered by Strava</p>
      </div>
    </main>
  );
}
