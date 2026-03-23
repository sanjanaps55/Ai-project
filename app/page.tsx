import Link from "next/link";
import { APP_NAME, TAGLINE } from "@/constants";
import { signInWithGoogle } from "./login/actions";

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

        <form className="flex flex-col gap-4 w-full sm:w-80">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-2xl bg-primary-purple px-10 py-5 text-lg font-bold text-bg-dark shadow-[0_0_30px_rgba(199,184,234,0.3)] transition hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(199,184,234,0.4)] active:scale-95"
          >
            Get Started
          </Link>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="bg-[#0F0F1B] px-2 text-white/40 uppercase tracking-widest">Or login with</span>
            </div>
          </div>

          <button
            formAction={signInWithGoogle}
            formNoValidate
            className="glass-morphism inline-flex items-center justify-center gap-3 rounded-2xl px-10 py-5 text-lg font-bold text-white transition hover:bg-white/10 active:scale-95"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>
        </form>
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
