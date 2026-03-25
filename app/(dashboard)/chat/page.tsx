"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { ChatBubble } from "@/components/ChatBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { useVoice } from "@/hooks/useVoice";
import { Send, Mic, MicOff } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

interface Message {
    id?: string;
    role: "user" | "assistant";
    content: string;
}

export default function ChatPage() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isListening, startListening, stopListening, speak, isSupported } = useVoice();

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
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    conversationId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage: Message = {
                    role: "assistant",
                    content: data.error || "Something went wrong. Please try again.",
                };
                setMessages((prev) => [...prev, errorMessage]);
                return;
            }

            // Add AI response
            const aiMessage: Message = { role: "assistant", content: data.response };
            setMessages((prev) => [...prev, aiMessage]);

            // Update conversation ID if this was a new conversation
            if (data.isNewConversation && data.conversationId) {
                setConversationId(data.conversationId);
                router.replace(`/chat?id=${data.conversationId}`, { scroll: false });
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
        if (isListening) {
            stopListening();
        } else {
            startListening((transcript) => {
                setInput((prev) => (prev ? prev + " " + transcript : transcript));
            });
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
                {messages.length > 0 && (
                    <button 
                        onClick={() => { setMessages([]); setConversationId(null); router.replace('/chat'); }}
                        className="text-xs font-medium px-3 py-1.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Clear chat
                    </button>
                )}
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
                    </div>
                ) : (
                    messages.map((message, index) => (
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
                    {/* Mic button */}
                    <div className="relative group shrink-0">
                        <button
                            type="button"
                            onClick={handleMicClick}
                            className={`p-3 rounded-full transition-all ${isListening
                                ? "bg-red-500/20 text-red-400 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                                : "hover:bg-white/5 text-white/50 hover:text-white/80"
                                }`}
                            disabled={!isSupported}
                        >
                            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                    </div>

                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 bg-transparent px-3 py-3 text-sm text-white/90 outline-none placeholder:text-white/30 font-medium"
                        placeholder={isListening ? "Listening..." : "Tell me what's on your mind..."}
                        disabled={isLoading}
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
