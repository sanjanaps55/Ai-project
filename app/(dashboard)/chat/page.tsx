"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { ChatBubble } from "@/components/ChatBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { Send, Mic, MicOff } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { LiveKitConnectPanel, type LiveKitTranscript, type LiveKitPanelHandle } from "@/components/LiveKitConnectPanel";

interface Message {
    id?: string;
    role: "user" | "assistant";
    content: string;
}

/** UI-only: one bubble for back-to-back user lines (e.g. STT segments); DB transcript unchanged. */
function mergeAdjacentUserMessagesForDisplay(messages: Message[]): Message[] {
    const out: Message[] = [];
    for (const m of messages) {
        const last = out[out.length - 1];
        if (m.role === "user" && last?.role === "user") {
            const a = last.content.replace(/\s+/g, " ").trim();
            const b = m.content.replace(/\s+/g, " ").trim();
            out[out.length - 1] = { role: "user", content: `${a} ${b}`.trim() };
        } else {
            out.push({ role: m.role, content: m.content });
        }
    }
    return out;
}

function ChatPageContent() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [livekitRoomId, setLivekitRoomId] = useState<string | null>(null);
    const [livekitConnected, setLivekitConnected] = useState(false);
    const [livekitMicOn, setLivekitMicOn] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const livekitRef = useRef<LiveKitPanelHandle>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const router = useRouter();

    const displayMessages = useMemo(
        () => mergeAdjacentUserMessagesForDisplay(messages),
        [messages]
    );

    // Supabase user ID for LiveKit + RLS-backed APIs (session may arrive right after redirect)
    useEffect(() => {
        const supabase = createClient();

        function applyUserFromSession(user: { id: string } | null) {
            if (user?.id) setUserId(user.id);
        }

        supabase.auth.getUser().then(({ data }) => {
            applyUserFromSession(data.user ?? null);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            applyUserFromSession(session?.user ?? null);
            if (event === "SIGNED_IN") {
                router.refresh();
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);



    // Load existing conversation if ID is in URL
    useEffect(() => {
        const id = searchParams.get("id");
        if (id) {
            setConversationId(id);
            loadMessages(id);
        } else {
            setConversationId(null);
            setMessages([]);
        }
    }, [searchParams]);

    // Create/load a dedicated LiveKit room id when user lands on chat.
    useEffect(() => {
        const id = searchParams.get("id");
        const sessionKey = "livekit_room_current";
        const convKey = id ? `livekit_room_conv_${id}` : null;
        const existing =
            (convKey ? window.localStorage.getItem(convKey) : null) ||
            window.sessionStorage.getItem(sessionKey);
        if (existing) {
            setLivekitRoomId(existing);
            return;
        }
        const generated = `room_${crypto.randomUUID()}`;
        setLivekitRoomId(generated);
        window.sessionStorage.setItem(sessionKey, generated);
        if (convKey) {
            window.localStorage.setItem(convKey, generated);
        }
    }, [searchParams]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    async function loadMessages(convId: string) {
        setIsLoadingHistory(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("messages")
                .select("transcript")
                .eq("conversation_id", convId)
                .limit(1);

            if (!error && data && data.length > 0 && data[0].transcript) {
                setMessages(data[0].transcript as Message[]);
            } else {
                if (error) console.error("Database fetch error:", error);
                setMessages([]);
            }
        } catch (err) {
            console.error("Error loading messages:", err);
        } finally {
            setIsLoadingHistory(false);
        }
    }

    const handleLivekitTranscript = useCallback((msg: LiveKitTranscript) => {
        setMessages((prev) => [...prev, { role: msg.role, content: msg.content }]);
    }, []);

    async function sendMessage(e?: React.FormEvent) {
        e?.preventDefault();
        const text = input.trim();
        if (!text || isLoading) return;

        // Add user message to UI immediately
        const userMessage: Message = { role: "user", content: text };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    conversationId,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                const errorMessage: Message = {
                    role: "assistant",
                    content: data.error || "Something went wrong. Please try again.",
                };
                setMessages((prev) => [...prev, errorMessage]);
                setIsLoading(false);
                return;
            }

            // Prepare a placeholder for the streamed response
            setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;
            let buffer = "";

            if (reader) {
                let aiContent = "";
                while (!done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (value) {
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split("\n");
                        // Keep the last potentially incomplete line in buffer
                        buffer = lines.pop() || "";
                        
                        for (const line of lines) {
                            if (!line.trim()) continue;
                            try {
                                const parsed = JSON.parse(line);
                                if (parsed.type === "meta") {
                                    if (parsed.isNewConversation && parsed.conversationId) {
                                        setConversationId(parsed.conversationId);
                                        router.replace(`/chat?id=${parsed.conversationId}`, { scroll: false });
                                        const sessionKey = "livekit_room_current";
                                        const convKey = `livekit_room_conv_${parsed.conversationId}`;
                                        if (livekitRoomId) {
                                            window.localStorage.setItem(convKey, livekitRoomId);
                                            window.sessionStorage.setItem(sessionKey, livekitRoomId);
                                        }
                                    }
                                } else if (parsed.type === "t") {
                                    // Remove typing indicator once we receive tokens
                                    setIsLoading(false);
                                    aiContent += parsed.d;
                                    setMessages((prev) => {
                                        const newMsgs = [...prev];
                                        newMsgs[newMsgs.length - 1].content = aiContent;
                                        return newMsgs;
                                    });
                                } else if (parsed.type === "error") {
                                    console.error("Stream parsing error from server:", parsed.message);
                                }
                            } catch (e) {
                                console.error("Failed to parse stream chunk:", e, line);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Send error:", err);
            const errorMessage: Message = {
                role: "assistant",
                content: "I'm having trouble connecting right now. Please try again in a moment. I'm here for you. 💜",
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }

    function handleMicClick() {
        if (livekitConnected) {
            void livekitRef.current?.toggleMic();
            return;
        }
        if (!livekitConnected && livekitRef.current) {
            void livekitRef.current.connect();
            return;
        }
    }

    return (
        <div className="flex flex-col w-full max-w-4xl mx-auto h-[650px] rounded-[2rem] border border-white/5 bg-[#1A1A2E]/20 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden relative mt-2">
            
            {/* Header for the boxed chat */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary-purple to-secondary flex items-center justify-center shadow-[0_0_15px_rgba(199,184,234,0.3)]">
                        <span className="text-xs font-bold text-bg-dark">N</span>
                    </div>
                    <span className="font-semibold text-white/90">Nova</span>
                </div>
                <div className="flex items-center gap-3">
                    <LiveKitConnectPanel
                        ref={livekitRef}
                        roomId={livekitRoomId}
                        userIdentity={userId}
                        onTranscript={handleLivekitTranscript}
                        onConnectionChange={setLivekitConnected}
                        onMicChange={setLivekitMicOn}
                    />
                    {messages.length > 0 && (
                        <button
                            onClick={() => {
                                setMessages([]);
                                setConversationId(null);
                                router.replace("/chat");
                            }}
                            className="text-xs font-medium px-3 py-1.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            Clear chat
                        </button>
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 space-y-6 overflow-y-auto pt-6 pb-[100px] px-4 md:px-12 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {isLoadingHistory ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-white/30 text-sm">Loading conversation...</div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 animate-in fade-in duration-700 pb-12">
                        <h2 className="text-white/80 text-xl font-medium">How are you feeling today?</h2>
                        <p className="text-white/30 text-sm text-center max-w-[280px]">
                            Share what&#39;s on your mind. I&#39;m here to listen and support you.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                            <button
                                onClick={() => {
                                    document.querySelector('input')?.focus();
                                }}
                                className="px-5 py-2.5 rounded-full border border-white/10 bg-white/5 text-white/80 text-sm font-semibold hover:bg-white/10 transition-colors"
                            >
                                Chat with therapist
                            </button>
                            {!livekitConnected && (
                                <button
                                    onClick={() => livekitRef.current?.connect()}
                                    className="px-5 py-2.5 rounded-full bg-gradient-to-tr from-primary-purple to-secondary text-bg-dark text-sm font-semibold shadow-[0_4px_20px_rgba(199,184,234,0.4)] hover:scale-105 transition-transform flex items-center gap-2"
                                >
                                    <Mic size={16} /> Start voice chat
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    displayMessages.map((message, index) => (
                        <ChatBubble
                            key={index}
                            role={message.role === "assistant" ? "ai" : "user"}
                            content={message.content}
                        />
                    ))
                )}

                {isLoading && (
                    <div className="flex justify-start">
                        <TypingIndicator />
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Message Input Bar */}
            <div className="absolute bottom-0 left-0 right-0 z-30 px-6 pb-6 pt-12 bg-gradient-to-t from-[#0F0F1B] via-[#0F0F1B]/80 to-transparent flex justify-center pointer-events-none">
                <form
                    className="w-full max-w-3xl bg-[#1A1A2E]/90 backdrop-blur-2xl rounded-[32px] p-2 flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-white/10 pointer-events-auto"
                    onSubmit={sendMessage}
                >
                    {/* Mic button — LiveKit voice trigger */}
                    <div className="relative group shrink-0">
                        <button
                            type="button"
                            onClick={handleMicClick}
                            className={`p-3 rounded-full transition-all ${
                                livekitConnected && livekitMicOn
                                    ? "bg-emerald-500/20 text-emerald-400 animate-pulse shadow-[0_0_20px_rgba(52,211,153,0.25)]"
                                    : livekitConnected && !livekitMicOn
                                    ? "bg-amber-500/20 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                                    : "hover:bg-white/5 text-white/50 hover:text-white/80"
                            }`}
                        >
                            {livekitConnected && !livekitMicOn ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                    </div>

                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 bg-transparent px-3 py-3 text-sm text-white/90 outline-none placeholder:text-white/30 font-medium"
                        placeholder={livekitConnected ? "Voice active — type or speak..." : "Tell me what's on your mind..."}
                        disabled={isLoading}
                        suppressHydrationWarning={true}
                    />


                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className={`p-3 rounded-full transition-all shrink-0 ${input.trim() && !isLoading
                            ? "bg-gradient-to-tr from-primary-purple to-secondary text-bg-dark shadow-[0_4px_20px_rgba(199,184,234,0.4)] scale-100"
                            : "bg-white/5 text-white/20 scale-95"
                            }`}
                    >
                        <Send size={18} className="translate-x-[1px]" />
                    </button>
                </form>
            </div>

        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full w-full">
                <div className="text-white/30 text-sm animate-pulse">Initializing chat...</div>
            </div>
        }>
            <ChatPageContent />
        </Suspense>
    );
}
