"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Chrome } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    router.push("/chat");
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#0F0F1B] px-6 py-12 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] glow-orb opacity-10" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-6">
            <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-primary-purple to-secondary p-0.5 shadow-[0_0_30px_rgba(199,184,234,0.3)]">
              <div className="h-full w-full rounded-full bg-bg-dark flex items-center justify-center">
                <span className="text-2xl">✨</span>
              </div>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-white/40 text-sm">Sign in to continue your mindfulness journey.</p>
        </div>

        <div className="glass-morphism rounded-[32px] p-8 space-y-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-primary-purple/40 transition-all"
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Password</label>
                <button type="button" className="text-[10px] font-bold uppercase tracking-widest text-primary-purple/60 hover:text-primary-purple transition-colors">Forgot?</button>
              </div>
              <input
                type="password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-primary-purple/40 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-purple text-bg-dark font-bold py-4 rounded-2xl mt-4 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(199,184,234,0.2)] disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Continue"}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-[#0F111E] px-4 text-white/20">or</span></div>
          </div>

          <button className="w-full bg-white/5 border border-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all">
            <Chrome size={18} className="text-accent" />
            <span className="text-sm">Continue with Google</span>
          </button>
        </div>

        <p className="text-center mt-8 text-xs text-white/20">
          Don't have an account? <Link href="/auth" className="text-primary-purple/60 font-bold hover:text-primary-purple transition-colors">Create one</Link>
        </p>
      </div>
    </div>
  );
}
