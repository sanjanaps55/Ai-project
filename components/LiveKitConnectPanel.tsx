"use client";

import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Room, RoomEvent, Track, RemoteTrackPublication, RemoteParticipant } from "livekit-client";

export type LiveKitTranscript = {
    role: "user" | "assistant";
    content: string;
    isFinal?: boolean;
    segmentId?: string;
};

export type LiveKitPanelHandle = {
    connect: () => Promise<void>;
    disconnect: () => void;
    toggleMic: () => Promise<void>;
};

type Props = {
    roomId: string | null;
    userIdentity?: string | null;
    onTranscript?: (msg: LiveKitTranscript) => void;
    onConnectionChange?: (connected: boolean) => void;
    onMicChange?: (enabled: boolean) => void;
};

export const LiveKitConnectPanel = forwardRef<LiveKitPanelHandle, Props>(
    function LiveKitConnectPanel({ roomId, userIdentity, onTranscript, onConnectionChange, onMicChange }, ref) {
        const roomName = useMemo(() => roomId || "nova-lobby", [roomId]);
        const [room, setRoom] = useState<Room | null>(null);
        const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
        const [error, setError] = useState<string | null>(null);
        const [micEnabled, setMicEnabled] = useState(false);
        const [audioBlocked, setAudioBlocked] = useState(false);
        const [agentPresent, setAgentPresent] = useState(false);

        const onTranscriptRef = useRef(onTranscript);
        onTranscriptRef.current = onTranscript;
        const onConnectionChangeRef = useRef(onConnectionChange);
        onConnectionChangeRef.current = onConnectionChange;
        const onMicChangeRef = useRef(onMicChange);
        onMicChangeRef.current = onMicChange;

        const seenSegments = useRef(new Set<string>());
        const audioContainerRef = useRef<HTMLDivElement>(null);

        const connect = useCallback(async () => {
            try {
                setStatus("connecting");
                setError(null);
                setAudioBlocked(false);
                setAgentPresent(false);
                seenSegments.current.clear();

                const q = new URLSearchParams({
                    room: roomName,
                    identity: userIdentity || `web-${Date.now()}`,
                    name: "Web User",
                });
                const tokenRes = await fetch(`/api/livekit/token?${q.toString()}`);
                const tokenData = await tokenRes.json();
                if (!tokenRes.ok) {
                    throw new Error(tokenData.error || "Failed to fetch LiveKit token");
                }

                const lkRoom = new Room();

                lkRoom.on(RoomEvent.Connected, () => {
                    setStatus("connected");
                    onConnectionChangeRef.current?.(true);
                });

                lkRoom.on(RoomEvent.Disconnected, () => {
                    setStatus("idle");
                    setMicEnabled(false);
                    setAudioBlocked(false);
                    setAgentPresent(false);
                    onMicChangeRef.current?.(false);
                    onConnectionChangeRef.current?.(false);
                    // Clean up attached audio elements
                    if (audioContainerRef.current) {
                        audioContainerRef.current.innerHTML = "";
                    }
                });

                lkRoom.on(RoomEvent.ParticipantConnected, (participant) => {
                    const identity = String(participant.identity ?? "").toLowerCase();
                    if (identity.includes("nova") || identity.includes("agent")) {
                        setAgentPresent(true);
                    }
                });

                // Attach agent audio tracks to DOM <audio> elements for playback
                lkRoom.on(
                    RoomEvent.TrackSubscribed,
                    (track, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
                        if (track.kind === Track.Kind.Audio) {
                            const identity = String(participant.identity ?? "").toLowerCase();
                            if (identity.includes("nova") || identity.includes("agent")) {
                                setAgentPresent(true);
                            }
                            const el = track.attach() as HTMLAudioElement;
                            el.setAttribute("autoplay", "true");
                            el.setAttribute("playsinline", "true");
                            el.preload = "auto";
                            // Some browsers need volume set explicitly
                            el.volume = 1;
                            // Avoid display:none on playable audio nodes in some browsers.
                            el.style.position = "absolute";
                            el.style.width = "0";
                            el.style.height = "0";
                            el.style.opacity = "0";
                            el.style.pointerEvents = "none";
                            audioContainerRef.current?.appendChild(el);

                            const tryPlay = () => {
                                const p = el.play();
                                if (p) {
                                    p.catch(() => setAudioBlocked(true));
                                }
                            };
                            tryPlay();
                            window.setTimeout(() => {
                                if (el.paused) tryPlay();
                            }, 250);

                            console.log(
                                "[LiveKit] Attached audio track from",
                                participant.identity
                            );
                        }
                    }
                );

                // Detach audio tracks on unsubscribe
                lkRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
                    if (track.kind === Track.Kind.Audio) {
                        const elements = track.detach();
                        elements.forEach((el) => el.remove());
                    }
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                lkRoom.on(RoomEvent.TranscriptionReceived, (segments: any[], participant: any) => {
                    for (const seg of segments) {
                        const segId = String(seg.id ?? "");

                        const text = String(seg.text ?? "").trim();
                        if (!text) continue;

                        const identity = String(participant?.identity ?? "");
                        const isAgent = identity.includes("nova") || identity.includes("agent");
                        const isFinal = Boolean(seg.final);

                        // Keep user transcript stable (final-only), but allow live interim text for agent.
                        if (!isAgent && !isFinal) continue;
                        if (isFinal && segId && seenSegments.current.has(segId)) continue;
                        if (isFinal && segId) seenSegments.current.add(segId);

                        onTranscriptRef.current?.({
                            role: isAgent ? "assistant" : "user",
                            content: text,
                            isFinal,
                            segmentId: segId || undefined,
                        });
                    }
                });

                await lkRoom.connect(tokenData.url, tokenData.token);
                setRoom(lkRoom);

                // Try to unlock browser audio
                await lkRoom.startAudio().catch(() => setAudioBlocked(true));
                window.setTimeout(() => {
                    void lkRoom.startAudio().catch(() => {});
                }, 300);

                const enableMicWithRetry = async () => {
                    const delays = [0, 400, 900];
                    for (const d of delays) {
                        if (d) await new Promise((r) => window.setTimeout(r, d));
                        try {
                            await lkRoom.localParticipant.setMicrophoneEnabled(true);
                            setMicEnabled(true);
                            onMicChangeRef.current?.(true);
                            return;
                        } catch (micErr) {
                            console.warn("[LiveKit] mic enable attempt failed:", micErr);
                        }
                    }
                    setMicEnabled(false);
                    onMicChangeRef.current?.(false);
                    setError("Connected, but mic publish is delayed. Tap mic to retry.");
                };
                await enableMicWithRetry();
            } catch (e) {
                console.error("LiveKit connect error:", e);
                setStatus("error");
                setError(e instanceof Error ? e.message : "Failed to connect to LiveKit");
                onConnectionChangeRef.current?.(false);
            }
        }, [roomName, userIdentity]);

        const unlockAudio = useCallback(async () => {
            if (!room) return;
            await room.startAudio();
            // Also resume any paused <audio> elements
            audioContainerRef.current?.querySelectorAll("audio").forEach((el) => {
                (el as HTMLAudioElement).play().catch(() => {});
            });
            setAudioBlocked(false);
        }, [room]);

        const disconnect = useCallback(() => {
            if (room) {
                room.disconnect();
                setRoom(null);
            }
            setStatus("idle");
            setMicEnabled(false);
            setAudioBlocked(false);
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
                {/* Hidden-ish container for agent audio elements */}
                <div ref={audioContainerRef} className="pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden />

                {audioBlocked && (
                    <button
                        type="button"
                        onClick={unlockAudio}
                        className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 animate-pulse hover:bg-amber-500/30 transition-colors"
                    >
                        Tap to hear Nova
                    </button>
                )}
                {status === "connected" && !agentPresent && (
                    <span className="text-amber-300/90">
                        Waiting for Nova agent...
                    </span>
                )}
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
