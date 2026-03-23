export default function ErrorPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="w-full max-w-md space-y-8 rounded-xl border border-red-500/10 bg-red-500/5 p-8 backdrop-blur-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-red-500">Authentication Error</h1>
                    <p className="mt-2 text-white/60">Sorry, something went wrong with the authentication process.</p>
                </div>
                <div className="mt-8">
                    <a
                        href="/login"
                        className="block w-full rounded-lg bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white/20"
                    >
                        Back to Login
                    </a>
                </div>
            </div>
        </div>
    )
}
