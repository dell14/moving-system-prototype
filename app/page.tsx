import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            SpeedShift (Mock)
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Front-end only prototype (no APIs). Implementing UC-01..UC-06 first.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">Customer</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link className="underline" href="/login">
                  Log in
                </Link>
              </li>
              <li>
                <Link className="underline" href="/register">
                  Register
                </Link>
              </li>
              <li>
                <Link className="underline" href="/quote">
                  Generate quote
                </Link>
              </li>
              <li>
                <Link className="underline" href="/feedback">
                  Rate your service
                </Link>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">Admin</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link className="underline" href="/admin/schedule">
                  Schedule employees
                </Link>
              </li>
              <li>
                <Link className="underline" href="/admin/inventory">
                  Check inventory
                </Link>
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
