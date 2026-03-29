"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/** Silence after last speech before Deepgram emits UtteranceEnd and we send the turn (ms). Max 5000 per Deepgram. */
const DEEPGRAM_UTTERANCE_END_MS = 3000;
/** After UtteranceEnd, brief buffer so a quick follow-on word isn’t split (ms). */
const VOICE_FLUSH_DEBOUNCE_MS = 120;
/**
 * Extra silence (ms) before phrase-level finals inside a long utterance (Deepgram endpointing).
 * UtteranceEnd + utterance_end_ms still gate when the full turn is sent to the LLM.
 */
const DEEPGRAM_ENDPOINTING_MS = 400;

export type VoiceStatus = "idle" | "listening" | "thinking" | "speaking" | "error";

export type VoiceListenCallbacks = {
    onInterim?: (transcript: string) => void;
    onUtteranceComplete: (fullTranscript: string) => void;
};

export type SpeakOptions = {
    /** Called when TTS finishes, fails, or is skipped. Not called if aborted via stopSpeaking. */
    onPlaybackEnd?: () => void;
    /** If true, keep Deepgram / mic running (voice mode barge-in while Nova speaks). */
    keepMicrophone?: boolean;
};

interface UseVoiceReturn {
    isListening: boolean;
    isSpeaking: boolean;
    voiceStatus: VoiceStatus;
    setVoiceStatus: (status: VoiceStatus) => void;
    startListening: (callbacks: VoiceListenCallbacks) => Promise<void>;
    stopListening: () => void;
    speak: (text: string, options?: SpeakOptions) => Promise<void>;
    stopSpeaking: () => void;
    isSupported: boolean;
}

export function useVoice(): UseVoiceReturn {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
    const [isSupported, setIsSupported] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const ttsAbortRef = useRef<AbortController | null>(null);
    const speakGenRef = useRef(0);

    /** After the last `is_final`, flush if no UtteranceEnd (some models / paths only send `last_word_end: -1`). */
    const FINAL_IDLE_FLUSH_MS = Math.max(DEEPGRAM_UTTERANCE_END_MS + 400, 1500);

    const listenStateRef = useRef<{
        currentUtt: string;
        /** Latest non-final text; UtteranceEnd can arrive before any is_final, so we need this. */
        lastInterim: string;
        turnBuffer: string;
        flushTimer: ReturnType<typeof setTimeout> | null;
        /** Fire flush after this long with no new transcript (covers interim-only + flaky UtteranceEnd). */
        speechIdleTimer: ReturnType<typeof setTimeout> | null;
        callbacks: VoiceListenCallbacks | null;
    }>({
        currentUtt: "",
        lastInterim: "",
        turnBuffer: "",
        flushTimer: null,
        speechIdleTimer: null,
        callbacks: null,
    });

    const stopSpeaking = useCallback(() => {
        speakGenRef.current += 1;
        ttsAbortRef.current?.abort();
        ttsAbortRef.current = null;

        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.removeAttribute("src");
            audioRef.current.load();
            audioRef.current = null;
        }
        setIsSpeaking(false);
        setVoiceStatus("idle");
    }, []);

    const clearListenAccumulators = useCallback(() => {
        const s = listenStateRef.current;
        if (s.flushTimer) {
            clearTimeout(s.flushTimer);
            s.flushTimer = null;
        }
        if (s.speechIdleTimer) {
            clearTimeout(s.speechIdleTimer);
            s.speechIdleTimer = null;
        }
        s.currentUtt = "";
        s.lastInterim = "";
        s.turnBuffer = "";
    }, []);

    const stopListening = useCallback(() => {
        clearListenAccumulators();
        listenStateRef.current.callbacks = null;

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;

        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setIsListening(false);
        setVoiceStatus("idle");
    }, [clearListenAccumulators]);

    useEffect(() => {
        if (typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia) {
            setIsSupported(true);
        }
        return () => {
            stopListening();
            stopSpeaking();
        };
    }, [stopListening, stopSpeaking]);

    const startListening = useCallback(
        async (callbacks: VoiceListenCallbacks): Promise<void> => {
            if (!isSupported) return;

            stopSpeaking();
            stopListening();

            clearListenAccumulators();
            listenStateRef.current.callbacks = callbacks;
            setVoiceStatus("listening");

            const scheduleFlush = () => {
                const s = listenStateRef.current;
                if (s.flushTimer) clearTimeout(s.flushTimer);
                s.flushTimer = setTimeout(() => {
                    s.flushTimer = null;
                    const t = s.turnBuffer.trim();
                    s.turnBuffer = "";
                    const cb = s.callbacks;
                    if (t && cb) cb.onUtteranceComplete(t);
                }, VOICE_FLUSH_DEBOUNCE_MS);
            };

            const clearSpeechIdleTimer = () => {
                const s = listenStateRef.current;
                if (s.speechIdleTimer) {
                    clearTimeout(s.speechIdleTimer);
                    s.speechIdleTimer = null;
                }
            };

            /** Reset after any transcript (interim or final): silence → flush without relying only on UtteranceEnd. */
            const bumpSpeechIdleFlush = () => {
                const s = listenStateRef.current;
                clearSpeechIdleTimer();
                s.speechIdleTimer = setTimeout(() => {
                    s.speechIdleTimer = null;
                    const piece = (s.currentUtt || s.lastInterim).trim();
                    if (!piece) return;
                    s.currentUtt = "";
                    s.lastInterim = "";
                    s.turnBuffer = s.turnBuffer ? `${s.turnBuffer} ${piece}` : piece;
                    scheduleFlush();
                }, FINAL_IDLE_FLUSH_MS);
            };

            const flushUtterancePiece = () => {
                clearSpeechIdleTimer();
                const s = listenStateRef.current;
                const piece = (s.currentUtt || s.lastInterim).trim();
                s.currentUtt = "";
                s.lastInterim = "";
                if (!piece) return;
                s.turnBuffer = s.turnBuffer ? `${s.turnBuffer} ${piece}` : piece;
                scheduleFlush();
            };

            try {
                const response = await fetch("/api/deepgram");
                const data = await response.json();

                if (!response.ok) {
                    console.error("Failed to get Deepgram key", data.error);
                    setVoiceStatus("error");
                    return;
                }

                const qs = new URLSearchParams({
                    model: "nova-2",
                    language: "en",
                    smart_format: "true",
                    interim_results: "true",
                    utterance_end_ms: String(DEEPGRAM_UTTERANCE_END_MS),
                    endpointing: String(DEEPGRAM_ENDPOINTING_MS),
                    vad_events: "true",
                });
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                });
                streamRef.current = stream;

                const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?${qs.toString()}`, [
                    "token",
                    data.key,
                ]);
                socketRef.current = socket;

                socket.onmessage = (message) => {
                    let received: Record<string, unknown>;
                    try {
                        received = JSON.parse(message.data as string) as Record<string, unknown>;
                    } catch {
                        return;
                    }
                    const type = received.type as string | undefined;

                    /**
                     * UtteranceEnd: Deepgram sends last_word_end: -1 when the utterance was already
                     * finalized — that event must be ignored (see Deepgram utterance-end docs).
                     * Otherwise flush after silence following the last finalized word.
                     */
                    if (type === "UtteranceEnd") {
                        const lastEnd = received.last_word_end as number | undefined;
                        if (lastEnd === -1) {
                            return;
                        }
                        flushUtterancePiece();
                        return;
                    }

                    const channel = (
                        (received.channel as { alternatives?: { transcript: string }[] } | undefined) ??
                        (Array.isArray(received.channels)
                            ? (received.channels as { alternatives?: { transcript: string }[] }[])[0]
                            : undefined)
                    );
                    if (!channel?.alternatives?.length) return;

                    const transcript = channel.alternatives[0].transcript ?? "";
                    const isFinal = Boolean(received.is_final);

                    if (transcript) {
                        if (isFinal) {
                            listenStateRef.current.currentUtt = transcript;
                        }
                        listenStateRef.current.lastInterim = transcript;
                        bumpSpeechIdleFlush();
                        if (!isFinal) {
                            listenStateRef.current.callbacks?.onInterim?.(transcript);
                        }
                    }
                };

                let openPromiseSettled = false;
                await new Promise<void>((resolve, reject) => {
                    const SOCKET_OPEN_MS = 20_000;
                    const timeoutId = window.setTimeout(() => {
                        if (openPromiseSettled) return;
                        openPromiseSettled = true;
                        reject(new Error("Deepgram WebSocket open timeout"));
                    }, SOCKET_OPEN_MS);

                    const clearWait = () => window.clearTimeout(timeoutId);

                    socket.onopen = () => {
                        if (openPromiseSettled) return;
                        try {
                            const mime =
                                typeof MediaRecorder !== "undefined" &&
                                MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                                    ? "audio/webm;codecs=opus"
                                    : undefined;
                            const mediaRecorder = mime
                                ? new MediaRecorder(stream, { mimeType: mime })
                                : new MediaRecorder(stream);
                            mediaRecorderRef.current = mediaRecorder;

                            mediaRecorder.addEventListener("dataavailable", (event) => {
                                if (event.data.size > 0 && socket.readyState === 1) {
                                    socket.send(event.data);
                                }
                            });

                            mediaRecorder.start(250);
                            setIsListening(true);
                            setVoiceStatus("listening");
                            clearWait();
                            openPromiseSettled = true;
                            resolve();
                        } catch (e) {
                            clearWait();
                            openPromiseSettled = true;
                            reject(e instanceof Error ? e : new Error("MediaRecorder failed"));
                        }
                    };

                    socket.onerror = () => {
                        console.error("Deepgram WebSocket error");
                        if (openPromiseSettled) {
                            stopListening();
                            return;
                        }
                        openPromiseSettled = true;
                        clearWait();
                        reject(new Error("Deepgram WebSocket error"));
                        stopListening();
                    };

                    socket.onclose = () => {
                        if (!openPromiseSettled) {
                            openPromiseSettled = true;
                            clearWait();
                            reject(new Error("Deepgram WebSocket closed before ready"));
                            stopListening();
                            return;
                        }
                        if (socketRef.current === socket) {
                            setIsListening(false);
                        }
                    };
                });
            } catch (err) {
                console.error("Error starting voice recognition:", err);
                setVoiceStatus("error");
                stopListening();
                throw err;
            }
        },
        [isSupported, stopSpeaking, stopListening, clearListenAccumulators]
    );

    const speak = useCallback(
        async (text: string, options?: SpeakOptions) => {
            const trimmed = text.trim();
            if (!trimmed) {
                options?.onPlaybackEnd?.();
                return;
            }

            stopSpeaking();
            if (!options?.keepMicrophone) {
                stopListening();
            }

            const requestGen = speakGenRef.current;
            setIsSpeaking(true);
            setVoiceStatus("speaking");

            const ac = new AbortController();
            ttsAbortRef.current = ac;

            const notifyPlaybackEnd = () => {
                if (requestGen === speakGenRef.current) {
                    options?.onPlaybackEnd?.();
                }
            };

            const finishSpeakingUi = () => {
                setIsSpeaking(false);
                setVoiceStatus("idle");
            };

            try {
                const res = await fetch("/api/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: trimmed }),
                    signal: ac.signal,
                });

                if (requestGen !== speakGenRef.current) return;

                if (!res.ok) {
                    console.error("Failed to fetch TTS audio");
                    finishSpeakingUi();
                    notifyPlaybackEnd();
                    return;
                }

                const blob = await res.blob();
                if (requestGen !== speakGenRef.current) return;

                const url = URL.createObjectURL(blob);
                objectUrlRef.current = url;

                const audio = new Audio(url);
                audioRef.current = audio;

                const cleanupAudio = () => {
                    if (objectUrlRef.current === url) {
                        URL.revokeObjectURL(url);
                        objectUrlRef.current = null;
                    }
                    audioRef.current = null;
                };

                await new Promise<void>((resolve) => {
                    let settled = false;
                    const done = () => {
                        if (settled) return;
                        settled = true;
                        cleanupAudio();
                        finishSpeakingUi();
                        notifyPlaybackEnd();
                        resolve();
                    };

                    audio.onended = () => done();
                    audio.onerror = () => done();

                    audio.play().then(
                        () => {
                            /* ended/error handlers fire when playback completes */
                        },
                        (playErr) => {
                            if ((playErr as Error).name === "AbortError") {
                                resolve();
                                return;
                            }
                            console.error("Audio play failed:", playErr);
                            done();
                        }
                    );
                });
            } catch (e) {
                if ((e as Error).name === "AbortError") return;
                console.error("Failed to play TTS audio", e);
                finishSpeakingUi();
                notifyPlaybackEnd();
            }
        },
        [stopSpeaking, stopListening]
    );

    return {
        isListening,
        isSpeaking,
        voiceStatus,
        setVoiceStatus,
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        isSupported,
    };
}
