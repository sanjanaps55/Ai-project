"use client";

import { useEffect, useState } from "react";
import { Music, Activity, Smile, Frown, Coffee } from "lucide-react";

interface SpotifyPlaylist {
    id: string;
    name: string;
    description: string;
    image: string;
    url: string;
    uri: string;
}

interface MusicResponse {
    dominantEmotion: string;
    searchQuery: string;
    playlists: SpotifyPlaylist[];
    error?: string;
}

export default function MusicTherapyPage() {
    const [data, setData] = useState<MusicResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchMusic() {
            try {
                const res = await fetch("/api/spotify/recommendations");
                const json = await res.json();
                if (res.ok) {
                    setData(json);
                } else {
                    console.error("Failed to load music:", json.error);
                }
            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchMusic();
    }, []);

    const getEmotionTheme = (emotion: string) => {
        switch (emotion) {
            case "anxiety":
                return { icon: <Activity className="text-amber-400" size={24} />, text: "We noticed you've been feeling anxious. Focus your breath and relax with these calming tracks.", color: "border-amber-400/30" };
            case "sadness":
                return { icon: <Frown className="text-blue-400" size={24} />, text: "It seems like you've been feeling down. Here is some comforting, uplifting acoustic music for you.", color: "border-blue-400/30" };
            case "anger":
                return { icon: <Activity className="text-red-400" size={24} />, text: "Frustration is normal. Let's release that tension with some deep focus piano and chill vibes.", color: "border-red-400/30" };
            case "joy":
                return { icon: <Smile className="text-emerald-400" size={24} />, text: "You've been in a great mood! Keep that momentum going with these upbeat mixes.", color: "border-emerald-400/30" };
            default:
                return { icon: <Coffee className="text-primary-purple" size={24} />, text: "Here are some great Lo-Fi beats to accompany your day.", color: "border-primary-purple/30" };
        }
    };

    const theme = getEmotionTheme(data?.dominantEmotion || "neutral");

    return (
        <div className="flex flex-col w-full h-full p-8 overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Music className="text-primary-purple" size={32} />
                    Music Therapy
                </h1>
                <p className="text-white/60">
                    Curated Spotify playlists dynamically matched to your recent emotional state.
                </p>
            </div>

            {isLoading ? (
                <div className="w-full flex items-center justify-center p-12 text-white/40 animate-pulse">
                    Analyzing emotional state and fetching Spotify playlists...
                </div>
            ) : data?.playlists && data.playlists.length > 0 ? (
                <>
                    {/* Emotion Context Banner */}
                    <div className={`w-full bg-[#1A1A2E]/60 border ${theme.color} rounded-2xl p-6 mb-8 backdrop-blur-md flex items-start gap-4`}>
                        <div className="mt-1 bg-white/5 p-3 rounded-full">
                            {theme.icon}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-1 capitalize">
                                Recent Mood: {data.dominantEmotion === "neutral" ? "Balanced" : data.dominantEmotion}
                            </h3>
                            <p className="text-white/70 leading-relaxed text-sm">
                                {theme.text}
                            </p>
                        </div>
                    </div>

                    {/* Spotify IFrames Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data.playlists.map((playlist) => (
                            <div key={playlist.id} className="w-full transition-transform hover:scale-[1.02] duration-300">
                                <iframe
                                    src={`https://open.spotify.com/embed/playlist/${playlist.id}`}
                                    width="100%"
                                    height="380"
                                    frameBorder="0"
                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                    loading="lazy"
                                    className="rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/10"
                                ></iframe>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="w-full flex flex-col items-center justify-center p-12 text-white/40 gap-4 bg-[#1A1A2E]/40 rounded-2xl border border-white/5">
                    <Music size={48} className="opacity-20" />
                    <p>No playlists found or missing Spotify keys.</p>
                </div>
            )}
        </div>
    );
}
