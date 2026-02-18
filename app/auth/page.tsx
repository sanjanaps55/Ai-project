import Link from "next/link";

export default function AuthPage() {
  return (
    <div className="page-container">
      <div className="mx-auto w-full max-w-md glass-panel p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Sign in or create an account to continue your journey with MindCare
            AI.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <button className="rounded-full bg-white px-3 py-1.5 text-slate-900 shadow-sm transition dark:bg-slate-900 dark:text-slate-50">
            Login
          </button>
          <button className="rounded-full px-3 py-1.5 text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
            Sign Up
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-50 dark:hover:border-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/40"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-50 dark:hover:border-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/40"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/40 transition hover:from-sky-600 hover:via-indigo-600 hover:to-fuchsia-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Continue
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-500">
          Authentication is not implemented yet. This is a preview of the
          experience.{" "}
          <Link
            href="/chat"
            className="font-medium text-indigo-500 underline-offset-2 hover:underline"
          >
            Skip to chat
          </Link>
          .
        </p>
      </div>
    </div>
  );
}


