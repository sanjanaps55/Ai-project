"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type VoiceStatus = "idle" | "listening" | "thinking" | "speaking" | "error";

interface UseVoiceReturn {
    isListening: boolean;
    isSpeaking: boolean;
    voiceStatus: VoiceStatus;
    setVoiceStatus: (status: VoiceStatus) => void;
    startListening: (onResult: (transcript: string, isFinal: boolean, speechFinal: boolean) => void) => Promise<void>;
    stopListening: () => void;
    speak: (text: string) => Promise<void>;
    stopSpeaking: () => void;
    isSupported: boolean;
}

export function useVoice(): UseVoiceReturn {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
    const [isSupported, setIsSupported] = useState(false);
    
    // Refs for Deepgram logic
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    
    // Ref for ElevenLabs audio playback
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Clean up on unmount and check for support
    useEffect(() => {
        if (typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia) {
            setIsSupported(true);
        }
        return () => {
            stopListening();
            stopSpeaking();
        };
    }, []);

    const stopSpeaking = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setIsSpeaking(false);
        setVoiceStatus("idle");
    }, []);

    const stopListening = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsListening(false);
        setVoiceStatus("idle");
    }, []);

    const startListening = useCallback(async (onResult: (transcript: string, isFinal: boolean, speechFinal: boolean) => void) => {
        if (!isSupported) return;

        // If the AI is currently talking, interrupt it!
        stopSpeaking();

        try {
            // 1. Get a temporary Deepgram Key
            const response = await fetch('/api/deepgram');
            const data = await response.json();
            
            if (!response.ok) {
                console.error("Failed to get Deepgram key", data.error);
                return;
            }

            // 2. Open Deepgram WebSocket
            const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?model=nova-2-conversationalai&smart_format=true&interim_results=true`, ['token', data.key]);
            socketRef.current = socket;

            // 3. Setup Mic Stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            socket.onopen = () => {
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;

                mediaRecorder.addEventListener("dataavailable", (event) => {
                    if (event.data.size > 0 && socket.readyState === 1) {
                        socket.send(event.data);
                    }
                });

                // Send chunks every 250ms for real-time latency
                mediaRecorder.start(250);
                setIsListening(true);
                setVoiceStatus("listening");
            };

            socket.onmessage = (message) => {
                const received = JSON.parse(message.data);
                
                // Add this guard for non-transcript messages (like metadata or heartbeats)
                if (!received.channel || !received.channel.alternatives) {
                    return;
                }

                const transcript = received.channel.alternatives[0].transcript;
                const isSpeechFinal = received.speech_final || false;

                
                if (transcript && received.is_final) {
                    onResult(transcript, true, isSpeechFinal);
                } else if (transcript) {
                    onResult(transcript, false, false);
                }
            };

            socket.onerror = (error) => {
                console.error("Deepgram WebSocket Error", error);
                stopListening();
            };

            socket.onclose = () => {
                setIsListening(false);
            };

        } catch (err) {
            console.error("Error starting voice recognition:", err);
            setVoiceStatus("error");
            stopListening();
        }
    }, [isSupported, stopSpeaking, stopListening]);

    const speak = useCallback(async (text: string) => {
        if (!text) return;
        
        // Stop any current audio
        stopSpeaking();
        
        // Immediately pause listening if we are going to speak, 
        // to prevent capturing AI response in the mic (if not using headphones)
        stopListening();

        setIsSpeaking(true);
        setVoiceStatus("speaking");

        try {
            const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text })
            });

            if (!res.ok) {
                console.error("Failed to fetch TTS audio");
                setIsSpeaking(false);
                return;
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(url);
            };

            audio.onerror = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(url);
            };

            await audio.play();
        } catch (e) {
            console.error("Failed to play TTS audio", e);
            setIsSpeaking(false);
            setVoiceStatus("idle");
        }
    }, [stopSpeaking, stopListening]);

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
