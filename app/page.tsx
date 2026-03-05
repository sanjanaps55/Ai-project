import Link from "next/link";
import { APP_NAME, TAGLINE } from "@/constants";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0F0F1B] px-6 py-12">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] glow-orb opacity-20" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] glow-orb opacity-20" />

      {/* Center Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
        <div className="mb-12 animate-float">
          <div className="h-32 w-32 rounded-full bg-gradient-to-tr from-primary-purple via-secondary to-accent p-0.5 shadow-[0_0_50px_rgba(199,184,234,0.4)]">
            <div className="h-full w-full rounded-full bg-bg-dark flex items-center justify-center">
              <span className="text-4xl">✨</span>
            </div>
          </div>
        </div>

        <h1 className="text-balance text-5xl font-bold tracking-tight text-white mb-4 sm:text-6xl">
          {APP_NAME}
        </h1>

        <p className="text-lg text-white/60 mb-12 max-w-lg leading-relaxed">
          {TAGLINE}. Your personal AI support companion for a calmer, more mindful life.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center rounded-2xl bg-primary-purple px-10 py-5 text-lg font-bold text-bg-dark shadow-[0_0_30px_rgba(199,184,234,0.3)] transition hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(199,184,234,0.4)] active:scale-95"
          >
            Get Started
          </Link>
          <Link
            href="/auth"
            className="glass-morphism inline-flex items-center justify-center rounded-2xl px-10 py-5 text-lg font-bold text-white transition hover:bg-white/10 active:scale-95"
          >
            Sign In
          </Link>
        </div>
      </div>

      <div className="mt-24 grid grid-cols-2 md:grid-cols-3 gap-8 opacity-40">
        <div className="text-center">
          <p className="text-2xl mb-2">🧘</p>
          <p className="text-[10px] font-bold uppercase tracking-widest">Mindfulness</p>
        </div>
        <div className="text-center">
          <p className="text-2xl mb-2">🌿</p>
          <p className="text-[10px] font-bold uppercase tracking-widest">Wellness</p>
        </div>
        <div className="hidden md:block text-center">
          <p className="text-2xl mb-2">💎</p>
          <p className="text-[10px] font-bold uppercase tracking-widest">Premium AI</p>
        </div>
      </div>

      <footer className="absolute bottom-8 text-[10px] text-white/20 uppercase tracking-[0.2em]">
        Powered by AI Wellness
      </footer>
    </div>
  );
}
