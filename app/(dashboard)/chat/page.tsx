"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { ChatBubble } from "@/components/ChatBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { useVoice } from "@/hooks/useVoice";
import { Send, Mic, MicOff } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { VoiceInteractionOverlay } from "@/components/VoiceInteractionOverlay";

/** In voice mode while the mic is listening: no interim transcript for this long → exit voice mode. */
const VOICE_IDLE_EXIT_MS = 10_000;
/** Brief pause after TTS before reopening mic (reduces echo picking up tail of playback). */
const RESUME_LISTEN_AFTER_TTS_MS = 200;

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

export default function ChatPage() {
    const [input, setInput] = useState("");
    const [interim, setInterim] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const isVoiceModeRef = useRef(false);
    const handleVoiceFinalRef = useRef<(t: string) => void>(() => {});
    const startRecordingRef = useRef<() => void>(() => {});
    const streamAssistantIdxRef = useRef<number | null>(null);
    const searchParams = useSearchParams();
    const router = useRouter();
    const { 
        isListening, 
        isSpeaking, 
        voiceStatus, 
        setVoiceStatus, 
        startListening, 
        stopListening, 
        speak, 
        stopSpeaking, 
        isSupported 
    } = useVoice();

    isVoiceModeRef.current = isVoiceMode;

    const displayMessages = useMemo(
        () => mergeAdjacentUserMessagesForDisplay(messages),
        [messages]
    );

    const prevUrlConversationIdRef = useRef<string | null>(null);

    // Stop TTS/mic when switching between saved chats or clearing (not on first assign of id for a new thread)
    useEffect(() => {
        const id = searchParams.get("id");
        const prev = prevUrlConversationIdRef.current;
        prevUrlConversationIdRef.current = id;
        const switched =
            (prev !== null && id !== null && prev !== id) ||
            (prev !== null && id === null);
        if (switched) {
            stopSpeaking();
            stopListening();
        }
    }, [searchParams, stopSpeaking, stopListening]);

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

            try {
                await speak(data.response);
            } catch {
                /* playback may be blocked or aborted */
            }

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

    const handleVoiceFinal = useCallback(
        async (transcript: string) => {
            const text = transcript.trim();
            if (!text) return;

            stopListening();

            setMessages((prev) => [...prev, { role: "user", content: text }]);

            setVoiceStatus("thinking");
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
                    const errJson = await response.json().catch(() => ({}));
                    setVoiceStatus("error");
                    if (isVoiceModeRef.current) {
                        await new Promise((r) => setTimeout(r, RESUME_LISTEN_AFTER_TTS_MS));
                        try {
                            await startRecordingRef.current();
                        } catch {
                            /* ignore */
                        }
                    }
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant" as const,
                            content:
                                (errJson as { error?: string }).error ||
                                "Something went wrong. Please try again.",
                        },
                    ]);
                    return;
                }

                if (!response.body) {
                    setVoiceStatus("error");
                    return;
                }

                setMessages((prev) => {
                    const next: Message[] = [...prev, { role: "assistant", content: "" }];
                    streamAssistantIdxRef.current = next.length - 1;
                    return next;
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let lineBuf = "";
                let fullAssistant = "";
                let speakCursor = 0;
                const ttsQueue: string[] = [];
                let streamEnded = false;

                const tryEnqueueSentences = () => {
                    while (true) {
                        const slice = fullAssistant.slice(speakCursor);
                        const m = slice.match(/^([\s\S]{10,}?[.!?])(?=\s|\n|$)/);
                        if (!m) break;
                        ttsQueue.push(m[1].trim());
                        speakCursor += m[0].length;
                    }
                };

                const resumeListenAfterSpeaking = async () => {
                    if (!isVoiceModeRef.current) return;
                    await new Promise((r) => setTimeout(r, RESUME_LISTEN_AFTER_TTS_MS));
                    if (!isVoiceModeRef.current) return;
                    setVoiceStatus("listening");
                    try {
                        await startRecordingRef.current();
                    } catch (e) {
                        console.error("Failed to restart microphone after reply:", e);
                        setVoiceStatus("error");
                    }
                };

                const speakWorker = (async () => {
                    while (true) {
                        if (ttsQueue.length > 0) {
                            const chunk = ttsQueue.shift()!;
                            if (!isVoiceModeRef.current) continue;
                            try {
                                await speak(chunk);
                            } catch {
                                /* blocked / aborted */
                            }
                            continue;
                        }
                        if (streamEnded) break;
                        await new Promise((r) => setTimeout(r, 25));
                    }
                    if (isVoiceModeRef.current) {
                        await resumeListenAfterSpeaking();
                    }
                })();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    lineBuf += decoder.decode(value, { stream: true });
                    const lines = lineBuf.split("\n");
                    lineBuf = lines.pop() || "";
                    for (const line of lines) {
                        if (!line.trim()) continue;
                        let msg: {
                            type: string;
                            conversationId?: string;
                            isNewConversation?: boolean;
                            d?: string;
                            full?: string;
                            message?: string;
                        };
                        try {
                            msg = JSON.parse(line);
                        } catch {
                            continue;
                        }
                        if (msg.type === "meta") {
                            if (msg.isNewConversation && msg.conversationId) {
                                setConversationId(msg.conversationId);
                                router.replace(`/chat?id=${msg.conversationId}`, { scroll: false });
                            }
                        } else if (msg.type === "t" && typeof msg.d === "string") {
                            fullAssistant += msg.d;
                            tryEnqueueSentences();
                            const idx = streamAssistantIdxRef.current;
                            setMessages((prev) => {
                                if (idx == null || idx >= prev.length) return prev;
                                const next = [...prev];
                                next[idx] = { role: "assistant", content: fullAssistant };
                                return next;
                            });
                        } else if (msg.type === "done" && typeof msg.full === "string") {
                            fullAssistant = msg.full;
                            tryEnqueueSentences();
                            const tail = fullAssistant.slice(speakCursor).trim();
                            if (tail.length > 0) ttsQueue.push(tail);
                            speakCursor = fullAssistant.length;
                            streamEnded = true;
                            const idx = streamAssistantIdxRef.current;
                            setMessages((prev) => {
                                if (idx == null || idx >= prev.length) return prev;
                                const next = [...prev];
                                next[idx] = { role: "assistant", content: msg.full! };
                                return next;
                            });
                        } else if (msg.type === "error") {
                            streamEnded = true;
                            setVoiceStatus("error");
                        }
                    }
                }

                streamEnded = true;
                const remainder = fullAssistant.slice(speakCursor).trim();
                if (remainder.length > 0) {
                    ttsQueue.push(remainder);
                }
                await speakWorker;

                if (!isVoiceModeRef.current) return;
            } catch (err) {
                console.error("Voice mode error:", err);
                setVoiceStatus("error");
                if (isVoiceModeRef.current) {
                    await new Promise((r) => setTimeout(r, RESUME_LISTEN_AFTER_TTS_MS));
                    try {
                        await startRecordingRef.current();
                    } catch {
                        /* ignore */
                    }
                }
            } finally {
                streamAssistantIdxRef.current = null;
                setIsLoading(false);
            }
        },
        [conversationId, router, speak, stopListening]
    );

    handleVoiceFinalRef.current = (t: string) => {
        void handleVoiceFinal(t);
    };

    const startRecording = useCallback(() => {
        return startListening({
            onInterim: (t) => setInterim(t),
            onUtteranceComplete: (full) => {
                setInterim("");
                handleVoiceFinalRef.current(full);
            },
        });
    }, [startListening]);

    startRecordingRef.current = startRecording;

    function handleMicClick() {
        if (isVoiceMode) {
            if (isLoading || isSpeaking) return;
            if (isListening) stopListening();
            else startRecording();
        } else {
            setIsVoiceMode(true);
            startRecording();
        }
    }

    // Voice mode + mic listening: no words (no interim updates) for VOICE_IDLE_EXIT_MS → exit voice mode.
    useEffect(() => {
        if (!isVoiceMode || isSpeaking || isLoading || !isListening) return;

        const id = window.setTimeout(() => {
            if (!isVoiceModeRef.current) return;
            setIsVoiceMode(false);
            stopListening();
            stopSpeaking();
            setInterim("");
        }, VOICE_IDLE_EXIT_MS);

        return () => window.clearTimeout(id);
    }, [
        isVoiceMode,
        isListening,
        isSpeaking,
        isLoading,
        interim,
        stopListening,
        stopSpeaking,
    ]);

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
                        onClick={() => {
                            stopSpeaking();
                            stopListening();
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
                    {/* Mic button */}
                    <div className="relative group shrink-0">
                        <button
                            type="button"
                            onClick={handleMicClick}
                            className={`p-3 rounded-full transition-all ${isListening
                                ? "bg-red-500/20 text-red-400 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                                : isSpeaking
                                ? "bg-cyan-500/20 text-cyan-400 animate-pulse shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                                : "hover:bg-white/5 text-white/50 hover:text-white/80"
                                }`}
                            disabled={
                                !isSupported ||
                                (isVoiceMode && (isLoading || isSpeaking))
                            }
                        >
                            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                    </div>

                    <input
                        value={interim ? `${input} ${interim}`.trim() : input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 bg-transparent px-3 py-3 text-sm text-white/90 outline-none placeholder:text-white/30 font-medium"
                        placeholder={isListening ? "Listening..." : "Tell me what's on your mind..."}
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

            {/* Voice Interaction Overlay */}
            {isVoiceMode && (
                <VoiceInteractionOverlay 
                    status={voiceStatus} 
                    onExit={() => {
                        setIsVoiceMode(false);
                        stopListening();
                        stopSpeaking();
                    }}
                    interimTranscript={interim}
                />
            )}
        </div>
    );
}
