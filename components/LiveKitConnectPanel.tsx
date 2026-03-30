"use client";

import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

export type LiveKitTranscript = {
    role: "user" | "assistant";
    content: string;
};

export type LiveKitPanelHandle = {
    connect: () => Promise<void>;
    disconnect: () => void;
    toggleMic: () => Promise<void>;
};

type Props = {
    roomId: string | null;
    onTranscript?: (msg: LiveKitTranscript) => void;
    onConnectionChange?: (connected: boolean) => void;
    onMicChange?: (enabled: boolean) => void;
};

export const LiveKitConnectPanel = forwardRef<LiveKitPanelHandle, Props>(
    function LiveKitConnectPanel({ roomId, onTranscript, onConnectionChange, onMicChange }, ref) {
        const roomName = useMemo(() => roomId || "nova-lobby", [roomId]);
        const [room, setRoom] = useState<Room | null>(null);
        const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
        const [error, setError] = useState<string | null>(null);
        const [micEnabled, setMicEnabled] = useState(false);

        const onTranscriptRef = useRef(onTranscript);
        onTranscriptRef.current = onTranscript;
        const onConnectionChangeRef = useRef(onConnectionChange);
        onConnectionChangeRef.current = onConnectionChange;
        const onMicChangeRef = useRef(onMicChange);
        onMicChangeRef.current = onMicChange;

        const seenSegments = useRef(new Set<string>());

        const connect = useCallback(async () => {
            try {
                setStatus("connecting");
                setError(null);
                seenSegments.current.clear();

                const q = new URLSearchParams({
                    room: roomName,
                    identity: `web-${Date.now()}`,
                    name: "Web User",
                });
                const tokenRes = await fetch(`/api/livekit/token?${q.toString()}`);
                const tokenData = await tokenRes.json();
                if (!tokenRes.ok) {
                    throw new Error(tokenData.error || "Failed to fetch LiveKit token");
                }

                const lkRoom = new Room({ webAudioMix: true });

                lkRoom.on(RoomEvent.Connected, () => {
                    setStatus("connected");
                    onConnectionChangeRef.current?.(true);
                });

                lkRoom.on(RoomEvent.Disconnected, () => {
                    setStatus("idle");
                    setMicEnabled(false);
                    onMicChangeRef.current?.(false);
                    onConnectionChangeRef.current?.(false);
                });

                lkRoom.on(RoomEvent.TrackSubscribed, (track) => {
                    if (track.kind === Track.Kind.Audio) {
                        lkRoom.startAudio().catch(() => {});
                    }
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                lkRoom.on(RoomEvent.TranscriptionReceived, (segments: any[], participant: any) => {
                    for (const seg of segments) {
                        if (!seg.final) continue;
                        const segId = String(seg.id ?? "");
                        if (segId && seenSegments.current.has(segId)) continue;
                        if (segId) seenSegments.current.add(segId);

                        const text = String(seg.text ?? "").trim();
                        if (!text) continue;

                        const identity = String(participant?.identity ?? "");
                        const isAgent = identity.includes("nova") || identity.includes("agent");

                        onTranscriptRef.current?.({
                            role: isAgent ? "assistant" : "user",
                            content: text,
                        });
                    }
                });

                await lkRoom.connect(tokenData.url, tokenData.token);
                setRoom(lkRoom);

                // Unlock browser audio playback (must happen after user gesture + connect)
                await lkRoom.startAudio();

                await lkRoom.localParticipant.setMicrophoneEnabled(true);
                setMicEnabled(true);
                onMicChangeRef.current?.(true);
            } catch (e) {
                console.error("LiveKit connect error:", e);
                setStatus("error");
                setError(e instanceof Error ? e.message : "Failed to connect to LiveKit");
                onConnectionChangeRef.current?.(false);
            }
        }, [roomName]);

        const disconnect = useCallback(() => {
            if (room) {
                room.disconnect();
                setRoom(null);
            }
            setStatus("idle");
            setMicEnabled(false);
            onMicChangeRef.current?.(false);
        }, [room]);

        const toggleMic = useCallback(async () => {
            if (!room) return;
            const next = !micEnabled;
            await room.localParticipant.setMicrophoneEnabled(next);
            setMicEnabled(next);
            onMicChangeRef.current?.(next);
        }, [room, micEnabled]);

        useImperativeHandle(ref, () => ({ connect, disconnect, toggleMic }), [connect, disconnect, toggleMic]);

        return (
            <div className="flex items-center gap-2 text-xs">
                <span
                    className={`${
                        status === "connected"
                            ? "text-emerald-300"
                            : status === "connecting"
                            ? "text-amber-300 animate-pulse"
                            : status === "error"
                            ? "text-red-300"
                            : "text-white/40"
                    }`}
                >
                    {status === "connected"
                        ? micEnabled
                            ? "Voice active"
                            : "Connected (muted)"
                        : status === "connecting"
                        ? "Connecting..."
                        : status === "error"
                        ? "Error"
                        : ""}
                </span>
                {room && (
                    <button
                        type="button"
                        onClick={disconnect}
                        className="px-2 py-1 rounded-full border border-white/10 text-white/50 hover:text-red-300 hover:border-red-400/30 hover:bg-red-500/5 transition-colors"
                    >
                        End voice
                    </button>
                )}
                {error && <span className="text-red-300 truncate max-w-[180px]">{error}</span>}
            </div>
        );
    }
);
