import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const avatarUrl = user.user_metadata?.avatar_url;
    const fullName = user.user_metadata?.full_name || "User";

    return (
        <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
            <header className="px-1 shrink-0 pb-6 pt-2">
                <h1 className="text-[28px] font-medium text-white mb-2 tracking-tight">Profile</h1>
                <p className="text-white/40 text-[15px] leading-relaxed max-w-[280px]">
                    Manage your account details and preferences.
                </p>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-6 space-y-6 px-1">
                <div className="p-5 rounded-[24px] border border-white/5 bg-white/[0.02] space-y-4">
                    <div className="flex items-center gap-4">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Profile" className="h-16 w-16 rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="h-16 w-16 rounded-full bg-primary-purple/20 flex items-center justify-center text-primary-purple text-2xl font-bold">
                                {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                            </div>
                        )}
                        <div>
                            <p className="text-white font-medium text-[17px]">{fullName}</p>
                            <p className="text-white/40 text-sm">{user.email}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
