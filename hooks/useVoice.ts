"use client";

// Web Speech API type declarations (not in default TS lib)
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    readonly length: number;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    onerror: ((event: Event) => void) | null;
    start(): void;
    stop(): void;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

import { useState, useRef, useCallback } from "react";

interface UseVoiceReturn {
    isListening: boolean;
    isSpeaking: boolean;
    startListening: (onResult: (transcript: string) => void) => void;
    stopListening: () => void;
    speak: (text: string) => void;
    stopSpeaking: () => void;
    isSupported: boolean;
}

export function useVoice(): UseVoiceReturn {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const isSupported = typeof window !== "undefined" && (
        "SpeechRecognition" in window || "webkitSpeechRecognition" in window
    );

    const startListening = useCallback((onResult: (transcript: string) => void) => {
        if (!isSupported) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = event.results[0][0].transcript;
            onResult(transcript);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    }, [isSupported]);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    const speak = useCallback((text: string) => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to use a natural voice
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(
            (v) => v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha")
        );
        if (preferred) utterance.voice = preferred;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, []);

    const stopSpeaking = useCallback(() => {
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
    }, []);

    return {
        isListening,
        isSpeaking,
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        isSupported,
    };
}
