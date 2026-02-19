"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    // Accept any credentials - bypass authentication for now
    await new Promise((resolve) => setTimeout(resolve, 500));
    router.push("/chat");
  };

  return (
    <div className="page-container">
      <div className="mx-auto w-full max-w-md glass-panel p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[#2D2D2D] dark:text-[#EDE8E0]">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-[#9A9A9A] dark:text-[#C5C0BA]">
            Sign in to continue your journey with Nova.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#2D2D2D] dark:text-[#EDE8E0]"
            >
              Email or Username
            </label>
            <input
              id="email"
              type="text"
              required
              className="w-full rounded-xl border border-[#C5C0BA] bg-[#EDE8E0] px-3 py-2 text-sm text-[#2D2D2D] shadow-sm outline-none transition placeholder:text-[#C5C0BA] hover:border-[#8B6BB5] focus:border-[#8B6BB5] focus:ring-2 focus:ring-[#D4A5A5]/60 dark:border-[#1A1A1A] dark:bg-[#1A1A1A] dark:text-[#EDE8E0] dark:placeholder:text-[#9A9A9A] dark:hover:border-[#8B6BB5] dark:focus:border-[#8B6BB5] dark:focus:ring-[#8B6BB5]/40"
              placeholder="any username"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#2D2D2D] dark:text-[#EDE8E0]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="w-full rounded-xl border border-[#C5C0BA] bg-[#EDE8E0] px-3 py-2 text-sm text-[#2D2D2D] shadow-sm outline-none transition placeholder:text-[#C5C0BA] hover:border-[#8B6BB5] focus:border-[#8B6BB5] focus:ring-2 focus:ring-[#D4A5A5]/60 dark:border-[#1A1A1A] dark:bg-[#1A1A1A] dark:text-[#EDE8E0] dark:placeholder:text-[#9A9A9A] dark:hover:border-[#8B6BB5] dark:focus:border-[#8B6BB5] dark:focus:ring-[#8B6BB5]/40"
              placeholder="any password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#8B6BB5] via-[#D4A5A5] to-[#A8C5C0] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#1A1A1A]/15 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B6BB5] disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Continue"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#9A9A9A] dark:text-[#9A9A9A]">
          Any credentials will work until authentication is set up.
        </p>
      </div>
    </div>
  );
}
