import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-6xl space-y-10">
        <section className="border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="grid gap-8 px-8 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-12">
            <div className="space-y-5">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">
                Montreal Moving and Logistics
              </div>
              <div className="space-y-3">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-zinc-50">
                  Reliable booking, delivery, and moving support for homes and businesses.
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-zinc-300">
                  SpeedShift Logistics helps customers request quotes, confirm bookings, and stay
                  organized from first estimate to service day.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  className="bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                  href="/quote"
                >
                  Get a Quote
                </Link>
                <Link
                  className="border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  href="/booking"
                >
                  Confirm Booking & Deposit
                </Link>
              </div>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                Existing customer?{" "}
                <Link className="font-medium text-slate-800 underline dark:text-zinc-100" href="/login">
                  Log in
                </Link>{" "}
                to continue your request.
              </p>
            </div>

            <aside className="border border-slate-200 bg-slate-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="text-sm font-semibold text-slate-900 dark:text-zinc-50">
                Service coverage
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-zinc-300">
                <li>Local moving support across Montreal and nearby communities.</li>
                <li>Quote-first booking flow with deposit confirmation.</li>
                <li>Customer feedback and follow-up built into the service process.</li>
              </ul>
            </aside>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-zinc-50">
              Plan your service in a few clear steps
            </h2>
            <p className="text-sm text-slate-600 dark:text-zinc-400">
              The main customer journeys are available directly from the site.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Get a Quote",
                copy: "Request an estimate for your move, delivery, or storage needs.",
                href: "/quote",
                label: "Start quote",
              },
              {
                title: "Confirm Booking",
                copy: "Review your quote and complete the deposit step to reserve service.",
                href: "/booking",
                label: "Go to booking",
              },
              {
                title: "Leave Feedback",
                copy: "Share service feedback after your move so the team can follow up.",
                href: "/feedback",
                label: "Open feedback",
              },
              {
                title: "Customer Log In",
                copy: "Access your account to continue an existing request or booking.",
                href: "/login",
                label: "Log in",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <h3 className="text-lg font-semibold text-slate-950 dark:text-zinc-50">
                  {item.title}
                </h3>
                <p className="mt-2 min-h-16 text-sm leading-6 text-slate-600 dark:text-zinc-300">
                  {item.copy}
                </p>
                <Link
                  className="mt-4 inline-flex text-sm font-medium text-slate-800 underline underline-offset-4 dark:text-zinc-100"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-slate-200 bg-white px-8 py-8 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-slate-950 dark:text-zinc-50">
                Built for dependable, practical service
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-zinc-300">
                SpeedShift Logistics is positioned as a straightforward service business: clear
                quote requests, organized booking confirmation, and responsive follow-up for
                customers across Montreal.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-slate-600 dark:text-zinc-300">
              <div className="border border-slate-200 bg-slate-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                Reliable quote and booking flow with clear next steps.
              </div>
              <div className="border border-slate-200 bg-slate-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                Customer communication supported by feedback and notification tools.
              </div>
              <div className="border border-slate-200 bg-slate-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                Suitable for residential moves, scheduled deliveries, and storage coordination.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
