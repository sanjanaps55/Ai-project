import type { ChatRole } from "@/constants";

type ChatBubbleProps = {
    role: ChatRole;
    content: string;
};

export const ChatBubble = ({ role, content }: ChatBubbleProps) => {
    const isUser = role === "user";

    // Basic markdown-like rendering (bold, lists)
    function renderContent(text: string) {
        return text.split("\n").map((line, i) => {
            // Bold text
            const boldRendered = line.replace(
                /\*\*(.*?)\*\*/g,
                '<strong class="font-semibold">$1</strong>'
            );

            // Bullet points
            if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
                return (
                    <div key={i} className="flex gap-2 ml-2 mt-1">
                        <span className="text-primary-purple">•</span>
                        <span dangerouslySetInnerHTML={{ __html: boldRendered.replace(/^[-•]\s*/, "") }} />
                    </div>
                );
            }

            // Numbered lists
            const numberedMatch = line.trim().match(/^(\d+)\.\s(.+)/);
            if (numberedMatch) {
                return (
                    <div key={i} className="flex gap-2 ml-2 mt-1">
                        <span className="text-primary-purple font-medium">{numberedMatch[1]}.</span>
                        <span dangerouslySetInnerHTML={{ __html: boldRendered.replace(/^\d+\.\s*/, "") }} />
                    </div>
                );
            }

            // Empty lines as spacing
            if (line.trim() === "") {
                return <div key={i} className="h-2" />;
            }

            return (
                <p key={i} dangerouslySetInnerHTML={{ __html: boldRendered }} />
            );
        });
    }

    return (
        <div
            className={`flex w-full gap-3 ${isUser ? "justify-end" : "justify-start"}`}
        >
            {!isUser && (
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary-purple to-secondary text-[8px] font-bold text-bg-dark shadow-[0_0_15px_rgba(199,184,234,0.3)]">
                    AI
                </div>
            )}
            <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${isUser
                    ? "bg-primary-purple text-bg-dark font-medium shadow-[0_0_20px_rgba(199,184,234,0.2)]"
                    : "glass-card text-white/90"
                    }`}
            >
                {isUser ? (
                    <p className="whitespace-normal">{content.replace(/\n+/g, " ").trim()}</p>
                ) : (
                    renderContent(content)
                )}
            </div>
            {isUser && (
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[7px] font-bold text-white/40 uppercase tracking-widest">
                    You
                </div>
            )}
        </div>
    );
};
