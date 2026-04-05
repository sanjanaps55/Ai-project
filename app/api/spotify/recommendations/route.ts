import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const GEMINI_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

type SentimentLog = {
    joy_score: number;
    anxiety_score: number;
    sadness_score: number;
    anger_score: number;
    created_at?: string;
};

type StructuredMemory = {
    keywords?: string[];
    recent_events?: string[];
    core_issues?: string[];
    preferences?: string[];
};

type MusicPlan = {
    searches: string[];
    userNote: string;
    dominantEmotion: string;
};

function summarizeMemory(raw: unknown): string {
    if (!raw || typeof raw !== "object") return "";
    const m = raw as StructuredMemory;
    const lines: string[] = [];
    const add = (label: string, arr: string[] | undefined, max: number) => {
        if (!arr?.length) return;
        lines.push(`${label}: ${arr.slice(0, max).join("; ")}`);
    };
    add("Themes and topics", m.keywords, 10);
    add("What they're dealing with", m.core_issues, 5);
    add("What tends to help them", m.preferences, 5);
    add("Recent life context", m.recent_events, 4);
    return lines.join("\n").slice(0, 1500);
}

function dominantFromLog(log: SentimentLog): { name: string; score: number } {
    const emotions = [
        { name: "joy", score: log.joy_score },
        { name: "anxiety", score: log.anxiety_score },
        { name: "sadness", score: log.sadness_score },
        { name: "anger", score: log.anger_score },
    ];
    emotions.sort((a, b) => b.score - a.score);
    return emotions[0];
}

function formatSentimentTrend(logs: SentimentLog[]): string {
    if (!logs.length) return "No recent mood check-ins yet.";
    return logs
        .slice(0, 4)
        .map((l, i) => {
            const d = dominantFromLog(l);
            return `Check-in ${i + 1}: joy ${l.joy_score}, anxiety ${l.anxiety_score}, sadness ${l.sadness_score}, anger ${l.anger_score} (strongest: ${d.name} ${d.score})`;
        })
        .join("\n");
}

/** When Gemini is unavailable or fails: still personalize using memory + dominant mood. */
function fallbackMusicPlan(
    highest: { name: string; score: number } | null,
    memorySummary: string
): MusicPlan {
    const pickKeyword = (): string | null => {
        if (!memorySummary) return null;
        const firstLine = memorySummary.split("\n")[0] || "";
        const afterColon = firstLine.includes(":") ? firstLine.split(":").slice(1).join(":").trim() : firstLine;
        const token = afterColon.split(/[;,]/)[0]?.trim().split(/\s+/).slice(0, 2).join(" ");
        return token && token.length > 2 ? token : null;
    };
    const kw = pickKeyword();

    const baseByEmotion: Record<string, [string, string]> = {
        anxiety: ["Calm Nervous System Ambient", "Soft Piano Grounding"],
        sadness: ["Gentle Hope Acoustic Folk", "Warm Healing Instrumental"],
        anger: ["Cool Down Jazz Piano", "Deep Focus Flow Chill"],
        joy: ["Feel Good Indie Dance", "Bright Morning Upbeat"],
    };

    const emotion = highest && highest.score > 15 ? highest.name : "neutral";
    const [a, b] =
        emotion !== "neutral" && baseByEmotion[emotion]
            ? baseByEmotion[emotion]
            : ["Lo-Fi Focus Study", "Peaceful Instrumental Morning"];

    const searches: string[] = [];
    if (kw) {
        searches.push(`${kw} Calm Playlist`.slice(0, 80));
        searches.push((emotion !== "neutral" ? a : b).slice(0, 80));
    } else {
        searches.push(a.slice(0, 80));
        if (b !== a) searches.push(b.slice(0, 80));
    }

    const note =
        memorySummary && kw
            ? `These picks blend what you've shared with sounds that usually help when you're feeling ${emotion === "neutral" ? "a bit flat" : emotion}.`
            : highest && highest.score > 20
              ? `Tuned to your latest check-in (${emotion} stood out)—hope one of these fits how you're doing today.`
              : "Here are a few gentle starting points—tap what feels right.";

    return {
        searches: [...new Set(searches)].slice(0, 2),
        userNote: note,
        dominantEmotion: highest?.name ?? "neutral",
    };
}

async function geminiMusicPlan(
    apiKey: string,
    latestLog: SentimentLog | null,
    trendLines: string,
    memorySummary: string
): Promise<MusicPlan | null> {
    const highest = latestLog ? dominantFromLog(latestLog) : null;
    const scoresBlock = latestLog
        ? `Latest check-in — Joy: ${latestLog.joy_score}, Anxiety: ${latestLog.anxiety_score}, Sadness: ${latestLog.sadness_score}, Anger: ${latestLog.anger_score}. Strongest signal: ${highest?.name} (${highest?.score}).`
        : "No structured mood scores yet (user may be new).";

    const prompt = `You choose Spotify **playlist search queries** (what a user would type in Spotify's search bar).

${scoresBlock}

Recent check-ins trend:
${trendLines}

What we know about this person from therapy-style memory (may be empty):
${memorySummary || "(none yet)"}

Rules:
- Return 2 different search strings (2–5 words each), optimized for finding real Spotify playlists.
- Personalize using BOTH mood scores/trend AND memory when memory is present (themes, preferences, stressors). Do not use generic queries if you have specific themes (e.g. exams → "calm study piano"; grief → "gentle healing acoustic").
- First query: best match to soothe, ground, or celebrate as appropriate. Second query: complementary angle (e.g. slightly more energizing, or nature/ambient, or focus)—still safe for their state.
- Avoid clinical words; use everyday language. No artist names unless very mainstream playlist titles use them.

Return ONLY valid JSON (no markdown):
{"searches":["first query","second query"],"userNote":"One short warm sentence (max 140 chars) for the user about why these picks."}`;

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.65,
                maxOutputTokens: 256,
                responseMimeType: "application/json",
            },
        }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    text = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!text) return null;

    try {
        const parsed = JSON.parse(text) as { searches?: string[]; userNote?: string };
        const searches = (parsed.searches || [])
            .map((s) => String(s).replace(/["']/g, "").trim())
            .filter(Boolean)
            .slice(0, 2);
        if (!searches.length) return null;
        const userNote = (parsed.userNote || "").trim().slice(0, 200);
        return {
            searches,
            userNote:
                userNote ||
                "Picked these playlists to match where you're at—see what resonates.",
            dominantEmotion: highest?.name ?? "neutral",
        };
    } catch {
        return null;
    }
}

async function searchPlaylists(
    accessToken: string,
    query: string,
    limit: number
): Promise<
    {
        id: string;
        name: string;
        description: string;
        image: string;
        url: string;
        uri: string;
    }[]
> {
    const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=${limit}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!searchResponse.ok) return [];
    const searchData = await searchResponse.json();
    const items = searchData.playlists?.items || [];
    return items
        .filter((p: unknown) => p != null)
        .map((p: Record<string, unknown>) => {
            const images = p.images as { url?: string }[] | undefined;
            const ext = p.external_urls as { spotify?: string } | undefined;
            return {
                id: p.id as string,
                name: p.name as string,
                description: (p.description as string) || "",
                image: images?.[0]?.url || "",
                url: ext?.spotify || "",
                uri: (p.uri as string) || "",
            };
        });
}

export async function GET() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [logsResult, memoryResult] = await Promise.all([
            supabase
                .from("sentiment_logs")
                .select("joy_score, anxiety_score, sadness_score, anger_score, created_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(5),
            supabase.from("user_memory").select("structured_memory").eq("user_id", user.id).maybeSingle(),
        ]);

        const logs = (logsResult.data || []) as SentimentLog[];
        const latestLog = logs[0] || null;
        const memorySummary = summarizeMemory(memoryResult.data?.structured_memory);
        const trendLines = formatSentimentTrend(logs);
        const highest = latestLog ? dominantFromLog(latestLog) : null;

        const apiKey = process.env.GEMINI_API_KEY?.trim();
        let plan: MusicPlan;

        const canUseGemini =
            !!apiKey && (!!latestLog || memorySummary.length > 20);

        if (canUseGemini) {
            const geminiPlan = await geminiMusicPlan(apiKey!, latestLog, trendLines, memorySummary);
            if (geminiPlan) {
                plan = geminiPlan;
            } else {
                plan = fallbackMusicPlan(highest, memorySummary);
            }
        } else if (latestLog && highest && highest.score > 30) {
            plan = fallbackMusicPlan(highest, memorySummary);
        } else if (memorySummary.length > 30) {
            plan = fallbackMusicPlan(null, memorySummary);
        } else {
            plan = {
                searches: ["Lo-Fi Beats Study", "Calm Instrumental Focus"],
                userNote: "A gentle default mix until we learn more from your chats and mood check-ins.",
                dominantEmotion: "neutral",
            };
        }

        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.json({ error: "Spotify credentials missing from environment" }, { status: 500 });
        }

        const authString = btoa(`${clientId}:${clientSecret}`);
        const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                Authorization: `Basic ${authString}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
        });

        if (!tokenResponse.ok) {
            return NextResponse.json(
                { error: "Failed to authenticate with Spotify" },
                { status: tokenResponse.status }
            );
        }

        const { access_token: accessToken } = await tokenResponse.json();

        const perQuery = 5;
        const seen = new Set<string>();
        const playlists: Awaited<ReturnType<typeof searchPlaylists>> = [];

        for (const q of plan.searches) {
            const batch = await searchPlaylists(accessToken, q, perQuery);
            for (const p of batch) {
                if (p.id && !seen.has(p.id)) {
                    seen.add(p.id);
                    playlists.push(p);
                }
            }
            if (playlists.length >= 10) break;
        }

        const searchQuery = plan.searches.join(" · ");

        return NextResponse.json({
            dominantEmotion: plan.dominantEmotion,
            searchQuery,
            searchQueries: plan.searches,
            personalizationNote: plan.userNote,
            playlists: playlists.slice(0, 9),
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Spotify API Route Error:", error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
