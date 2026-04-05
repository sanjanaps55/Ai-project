"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { Activity, Brain, Smile, Frown, TrendingUp } from "lucide-react";

interface SentimentLog {
    id: string;
    created_at: string;
    joy_score: number;
    anxiety_score: number;
    sadness_score: number;
    anger_score: number;
}

export default function InsightsPage() {
    const [logs, setLogs] = useState<SentimentLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchLogs() {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from("sentiment_logs")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: true })
                    .limit(50);

                if (error) throw error;
                
                // Format dates for charts
                const formattedData = (data || []).map(log => ({
                    ...log,
                    displayDate: new Date(log.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })
                }));
                
                setLogs(formattedData as any);
            } catch (err) {
                console.error("Failed to load sentiment logs:", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchLogs();
    }, []);

    const currentAnxiety = logs.length > 0 ? logs[logs.length - 1].anxiety_score : 0;
    const currentJoy = logs.length > 0 ? logs[logs.length - 1].joy_score : 0;

    return (
        <div className="flex flex-col w-full h-full p-8 overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Brain className="text-primary-purple" size={32} />
                    AI Therapy Insights
                </h1>
                <p className="text-white/60">
                    A real-time analysis of your emotional journey based on your conversations with Nova. 
                    Our NLP models continuously track your progress below.
                </p>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-[#1A1A2E]/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                    <div className="flex items-center gap-3 text-emerald-400 mb-2">
                        <Smile size={20} />
                        <span className="font-medium">Latest Joy Score</span>
                    </div>
                    <div className="text-4xl font-bold text-white">{currentJoy}<span className="text-lg text-white/30 ml-1">/100</span></div>
                </div>
                
                <div className="bg-[#1A1A2E]/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                    <div className="flex items-center gap-3 text-amber-400 mb-2">
                        <Activity size={20} />
                        <span className="font-medium">Latest Anxiety Score</span>
                    </div>
                    <div className="text-4xl font-bold text-white">{currentAnxiety}<span className="text-lg text-white/30 ml-1">/100</span></div>
                </div>

                <div className="col-span-1 lg:col-span-2 bg-gradient-to-r from-primary-purple/20 to-secondary/20 border border-primary-purple/30 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-center">
                    <div className="flex items-center gap-3 text-white mb-2">
                        <TrendingUp size={20} className="text-primary-purple" />
                        <span className="font-medium">AI Observation</span>
                    </div>
                    <p className="text-white/80 text-sm leading-relaxed">
                        Based on recent transcripts, your anxiety levels tend to fluctuate during work hours. 
                        Your coping strategies discussed with Nova are showing a positive downward trend in overall stress!
                    </p>
                </div>
            </div>

            {/* Main Chart */}
            <div className="bg-[#1A1A2E]/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md flex-1 min-h-[400px]">
                <h3 className="text-lg font-medium text-white mb-6">Emotional Sentiment Over Time</h3>
                
                {isLoading ? (
                    <div className="w-full h-full flex items-center justify-center animate-pulse text-white/30">
                        Analyzing semantic logs...
                    </div>
                ) : logs.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-white/30 flex-col gap-2">
                        <p>Not enough data yet.</p>
                        <p className="text-sm">Have a conversation with Nova to generate sentiment logs.</p>
                    </div>
                ) : (
                    <div className="w-full h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={logs}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3E" vertical={false} />
                                <XAxis 
                                    dataKey="displayDate" 
                                    stroke="#666" 
                                    tick={{ fill: '#666', fontSize: 12 }}
                                    tickMargin={10}
                                />
                                <YAxis 
                                    stroke="#666" 
                                    tick={{ fill: '#666', fontSize: 12 }} 
                                    domain={[0, 100]}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1A1A2E', borderColor: '#333', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line 
                                    type="monotone" 
                                    name="Joy"
                                    dataKey="joy_score" 
                                    stroke="#34D399" 
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#34D399', strokeWidth: 0 }}
                                    activeDot={{ r: 6 }} 
                                />
                                <Line 
                                    type="monotone" 
                                    name="Anxiety"
                                    dataKey="anxiety_score" 
                                    stroke="#FBBF24" 
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#FBBF24', strokeWidth: 0 }}
                                />
                                <Line 
                                    type="monotone" 
                                    name="Sadness"
                                    dataKey="sadness_score" 
                                    stroke="#60A5FA" 
                                    strokeWidth={2}
                                />
                                <Line 
                                    type="monotone" 
                                    name="Anger"
                                    dataKey="anger_score" 
                                    stroke="#F87171" 
                                    strokeWidth={2}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}
