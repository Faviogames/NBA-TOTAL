
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { ProcessedMatch, TeamStats } from '../types';

interface ScoringTrendProps {
  matches: ProcessedMatch[];
}

export const ScoringTrendChart: React.FC<ScoringTrendProps> = ({ matches }) => {
  const data = [...matches].sort((a,b) => a.date.getTime() - b.date.getTime()).slice(-20); // Last 20 games

  return (
    <div className="h-80 w-full">
      <h3 className="text-white font-semibold mb-4">Last 20 Games Total Score Trend</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" tickFormatter={(d) => d.toLocaleDateString()} stroke="#94a3b8" fontSize={12} />
          <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }} 
            itemStyle={{ color: '#fff' }}
            labelFormatter={(v) => v.toLocaleDateString()}
          />
          <Legend />
          <Line type="monotone" dataKey="totalScore" stroke="#3b82f6" strokeWidth={2} dot={false} name="Total Score" />
          <Line type="step" dataKey="line" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Line" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

interface TeamComparisonProps {
  team1: TeamStats;
  team2: TeamStats;
}

export const TeamComparisonRadar: React.FC<TeamComparisonProps> = ({ team1, team2 }) => {
  const data = [
    { subject: 'Avg Pts', A: team1.avgPointsFor, B: team2.avgPointsFor, fullMark: 130 },
    { subject: 'Def Pts', A: team1.avgPointsAgainst, B: team2.avgPointsAgainst, fullMark: 130 },
    { subject: 'Pace', A: team1.avgPace, B: team2.avgPace, fullMark: 110 },
    { subject: 'TS%', A: team1.avgTS, B: team2.avgTS, fullMark: 70 },
    { subject: 'Over %', A: team1.overRate, B: team2.overRate, fullMark: 100 },
  ];

  return (
    <div className="h-80 w-full">
      <h3 className="text-white font-semibold mb-4 text-center">Head-to-Head Stats</h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} />
          <PolarRadiusAxis angle={30} domain={[0, 140]} stroke="#475569" />
          <Radar name={team1.name} dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
          <Radar name={team2.name} dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
          <Legend />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface QuarterlyHeatmapProps {
    matches: ProcessedMatch[];
}

export const QuarterlyAvgChart: React.FC<QuarterlyHeatmapProps> = ({ matches }) => {
    // Calculate Avg score per quarter across all games provided
    const qSums = [0, 0, 0, 0];
    let count = 0;
    
    matches.forEach(m => {
        if(m.quarterlyTotals.length === 4) {
            m.quarterlyTotals.forEach((score, idx) => qSums[idx] += score);
            count++;
        }
    });

    const data = qSums.map((sum, idx) => ({
        name: `Q${idx + 1}`,
        avg: count ? Math.round(sum / count) : 0
    }));

    return (
        <div className="h-80 w-full">
            <h3 className="text-white font-semibold mb-4">League Avg Points per Quarter</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip cursor={{fill: '#334155'}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }} />
                    <Bar dataKey="avg" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Avg Total Points" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

interface TeamQuarterlyProps {
  team1Name: string;
  team1Data: number[];
  team2Name: string;
  team2Data: number[];
}

export const TeamQuarterlyChart: React.FC<TeamQuarterlyProps> = ({ team1Name, team1Data, team2Name, team2Data }) => {
    const data = [
        { name: 'Q1', [team1Name]: team1Data[0]?.toFixed(1) || 0, [team2Name]: team2Data[0]?.toFixed(1) || 0 },
        { name: 'Q2', [team1Name]: team1Data[1]?.toFixed(1) || 0, [team2Name]: team2Data[1]?.toFixed(1) || 0 },
        { name: 'Q3', [team1Name]: team1Data[2]?.toFixed(1) || 0, [team2Name]: team2Data[2]?.toFixed(1) || 0 },
        { name: 'Q4', [team1Name]: team1Data[3]?.toFixed(1) || 0, [team2Name]: team2Data[3]?.toFixed(1) || 0 },
    ];

    return (
        <div className="h-80 w-full">
            <h3 className="text-white font-semibold mb-4 text-center">Avg Points Per Quarter</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barGap={0}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={[0, 40]} />
                    <Tooltip cursor={{fill: '#334155'}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }} />
                    <Legend />
                    <Bar dataKey={team1Name} fill="#3b82f6" name={team1Name} radius={[4, 4, 0, 0]} />
                    <Bar dataKey={team2Name} fill="#10b981" name={team2Name} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
