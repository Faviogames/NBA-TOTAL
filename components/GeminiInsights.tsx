import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ProcessedMatch, TeamStats } from '../types';
import { Sparkles, Loader2 } from 'lucide-react';

interface GeminiInsightsProps {
  matches: ProcessedMatch[];
  teams: TeamStats[];
}

const GeminiInsights: React.FC<GeminiInsightsProps> = ({ matches, teams }) => {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsight = async () => {
    setLoading(true);
    setError(null);

    try {
        // Prepare a summary of data for the prompt
        const recentMatches = matches.slice(0, 5);
        const topOverTeams = [...teams].sort((a,b) => b.overRate - a.overRate).slice(0, 3);
        
        const prompt = `
        You are a professional NBA Sports Betting Analyst. Analyze the following summary data derived from historical matches and provide 3 key actionable betting insights for Totals (Over/Under).
        
        Data Summary:
        - Total Matches Analyzed: ${matches.length}
        - Top 3 Teams hitting the Over: ${topOverTeams.map(t => `${t.name} (${t.overRate.toFixed(1)}%)`).join(', ')}
        - Recent 5 games results: ${recentMatches.map(m => `${m.homeTeam} vs ${m.awayTeam}: Total ${m.totalScore} (Line ${m.line})`).join(' | ')}
        
        Format your response in Markdown with bold headers. Focus on trends, pace, and potential value. Keep it concise.
        `;

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            // Fallback if no key is present for the demo
            setInsight("## API Key Missing\n\nPlease provide a valid Gemini API Key in your environment variables to unlock AI insights.\n\n**Sample Insight (Mock):**\nBased on the data, **Indiana Pacers** show a strong correlation with high-scoring games due to their fast pace. Consider targeting 'Over' bets when they play low-defense teams.");
            setLoading(false);
            return;
        }

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        setInsight(response.text || "No insights generated.");
    } catch (err) {
        console.error(err);
        setError("Failed to generate insights. Please try again later.");
    } finally {
        setLoading(false);
    }
  };

  // Auto-generate on mount if key exists, else show button
  useEffect(() => {
      // Optional: Auto trigger or wait for user
  }, []);

  return (
    <div className="bg-secondary rounded-xl border border-slate-700 p-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-purple-400" /> AI Advisor
            </h2>
            <button 
                onClick={generateInsight}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" size={16} /> : 'Generate Insights'}
            </button>
        </div>

        <div className="bg-primary rounded-lg p-6 border border-slate-700 min-h-[200px]">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-textMuted gap-3">
                    <Loader2 className="animate-spin text-purple-500" size={32} />
                    <p>Analyzing historical data patterns...</p>
                </div>
            ) : error ? (
                <div className="text-danger text-center">{error}</div>
            ) : insight ? (
                <div className="prose prose-invert max-w-none">
                    {insight.split('\n').map((line, i) => (
                        <p key={i} className={line.startsWith('##') ? 'text-lg font-bold text-purple-300 mt-4 mb-2' : 'text-textMuted mb-2'}>
                            {line.replace('##', '').trim()}
                        </p>
                    ))}
                </div>
            ) : (
                <div className="text-center text-textMuted">
                    Click the button above to generate strategic betting insights using Gemini AI.
                </div>
            )}
        </div>
    </div>
  );
};

export default GeminiInsights;
