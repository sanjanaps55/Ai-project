import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Get the user's latest emotional sentiment
        const { data: logs, error: logsError } = await supabase
            .from("sentiment_logs")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1);

        let dominantEmotion = "neutral";
        let searchQuery = "Lo-Fi Beats"; // Default fallback

        if (!logsError && logs && logs.length > 0) {
            const latestLog = logs[0];
            const emotions = [
                { name: "joy", score: latestLog.joy_score },
                { name: "anxiety", score: latestLog.anxiety_score },
                { name: "sadness", score: latestLog.sadness_score },
                { name: "anger", score: latestLog.anger_score }
            ];
            
            // Find the highest scoring emotion
            emotions.sort((a, b) => b.score - a.score);
            const highest = emotions[0];

            // If the highest score is somewhat significant, set it as dominant
            // Use Gemini to generate a dynamic, nuanced Spotify search query based on exact scores
            if (process.env.GEMINI_API_KEY && highest.score > 20) {
                try {
                    const prompt = `You are a music therapist AI. Based on the user's current emotional state (Joy: ${latestLog.joy_score}, Anxiety: ${latestLog.anxiety_score}, Sadness: ${latestLog.sadness_score}, Anger: ${latestLog.anger_score}), generate a 2-4 word Spotify search query for a playlist that will help balance or support their mood. Return ONLY the search query string with no quotes or extra text.`;
                    
                    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ role: "user", parts: [{ text: prompt }] }],
                            generationConfig: { temperature: 0.5, maxOutputTokens: 20 },
                        }),
                    });

                    if (geminiResponse.ok) {
                        const data = await geminiResponse.json();
                        const generatedQuery = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                        if (generatedQuery) {
                            searchQuery = generatedQuery.replace(/["']/g, ''); // strip any quotes
                            dominantEmotion = highest.name; 
                        }
                    }
                } catch (err) {
                    console.error("Gemini failed to generate music query, using fallback:", err);
                    dominantEmotion = highest.name;
                }
            } else if (highest.score > 30) {
                // Fallback basic map if Gemini fails
                dominantEmotion = highest.name;
                switch (highest.name) {
                    case "anxiety": searchQuery = "Calm Meditation"; break;
                    case "sadness": searchQuery = "Uplifting Acoustic"; break;
                    case "anger": searchQuery = "Chill Vibes"; break;
                    case "joy": searchQuery = "Happy Upbeat Pop"; break;
                }
            }
        }

        // 2. Fetch Spotify Access Token via Client Credentials Flow
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.json({ error: "Spotify credentials missing from environment" }, { status: 500 });
        }

        const authString = btoa(`${clientId}:${clientSecret}`);
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        if (!tokenResponse.ok) {
            return NextResponse.json({ error: "Failed to authenticate with Spotify" }, { status: tokenResponse.status });
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // 3. Query Spotify for Playlists based on mapped emotion
        const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=playlist&limit=6`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!searchResponse.ok) {
            return NextResponse.json({ error: "Failed to fetch playlists from Spotify" }, { status: searchResponse.status });
        }

        const searchData = await searchResponse.json();
        const playlists = searchData.playlists?.items || [];

        return NextResponse.json({
            dominantEmotion,
            searchQuery,
            playlists: playlists.filter((p: any) => p != null).map((p: any) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                image: p.images?.[0]?.url || "",
                url: p.external_urls?.spotify,
                uri: p.uri
            }))
        });

    } catch (error: any) {
        console.error("Spotify API Route Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
