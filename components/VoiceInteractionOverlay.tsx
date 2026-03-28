"use client";

import { VoiceStatus } from "@/hooks/useVoice";
import { X, Mic, MicOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface VoiceInteractionOverlayProps {
    status: VoiceStatus;
    onExit: () => void;
    interimTranscript?: string;
}

export const VoiceInteractionOverlay = ({ status, onExit, interimTranscript }: VoiceInteractionOverlayProps) => {
    const [dots, setDots] = useState("");

    useEffect(() => {
        if (status === "thinking") {
            const interval = setInterval(() => {
                setDots(prev => (prev.length >= 3 ? "" : prev + "."));
            }, 500);
            return () => clearInterval(interval);
        } else {
            setDots("");
        }
    }, [status]);

    const getStatusText = () => {
        switch (status) {
            case "listening": return "Listening";
            case "thinking": return "Thinking" + dots;
            case "speaking": return "Nova is speaking";
            case "error": return "Connection error";
            default: return "Ready";
        }
    };

    const getGlowClass = () => {
        switch (status) {
            case "listening": return "animate-listening bg-red-500/20";
            case "thinking": return "animate-thinking bg-purple-500/20";
            case "speaking": return "animate-speaking bg-cyan-500/20";
            case "error": return "bg-red-900/40 p-4 rounded-full";
            default: return "animate-idle bg-white/5";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F0F1B]/80 backdrop-blur-3xl animate-in fade-in duration-500">
            
            {/* Top Info */}
            <div className="absolute top-12 flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-[#C7B8EA] to-[#706299] flex items-center justify-center shadow-[0_0_20px_rgba(199,184,234,0.4)]">
                    <span className="text-lg font-bold text-bg-dark">N</span>
                </div>
                <h2 className="text-xl font-medium text-white/90">Nova</h2>
            </div>

            {/* Central Glow Orb */}
            <div className="relative flex items-center justify-center w-64 h-64">
                <div className={`absolute inset-0 rounded-full blur-[60px] transition-all duration-1000 ${getGlowClass()}`} />
                
                {/* Inner Icon Circle */}
                <div className="relative z-10 w-32 h-32 rounded-full border border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-center shadow-inner">
                   {status === "thinking" ? (
                       <Loader2 className="text-purple-300 animate-spin" size={40} />
                   ) : status === "listening" ? (
                       <Mic className="text-red-400 animate-pulse" size={40} />
                   ) : status === "speaking" ? (
                       <div className="flex gap-1 items-end h-8">
                           <div className="w-1.5 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_0ms]" />
                           <div className="w-1.5 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_200ms]" />
                           <div className="w-1.5 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_400ms]" />
                           <div className="w-1.5 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_600ms]" />
                       </div>
                   ) : (
                       <Mic className="text-white/20" size={40} />
                   )}
                </div>
            </div>

            {/* Status Text */}
            <div className="mt-16 text-center">
                <p className={`text-sm font-medium tracking-[0.2em] uppercase transition-colors duration-500 ${
                    status === 'listening' ? 'text-red-400' : 
                    status === 'thinking' ? 'text-purple-300' : 
                    status === 'speaking' ? 'text-cyan-300' : 
                    'text-white/40'
                }`}>
                    {getStatusText()}
                </p>
                
                {/* Subtle Transcript (Fading) */}
                {interimTranscript && status === 'listening' && (
                    <p className="mt-4 text-white/30 text-sm max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-300 italic">
                        "{interimTranscript}"
                    </p>
                )}
            </div>

            {/* Exit Button */}
            <div className="absolute bottom-16">
                <button
                    onClick={onExit}
                    className="group flex items-center gap-3 px-8 py-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all duration-300 shadow-lg"
                >
                    <div className="p-1.5 bg-red-500/20 rounded-full group-hover:bg-red-500/30 transition-colors">
                        <X size={18} className="text-red-400" />
                    </div>
                    <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
                        Exit Voice Mode
                    </span>
                </button>
            </div>
        </div>
    );
};
