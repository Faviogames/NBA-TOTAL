
import React, { useState, useMemo } from 'react';
import { TeamStats, ProcessedMatch } from '../types';
import { TeamComparisonRadar, TeamQuarterlyChart } from './Charts';
import { Flame, Snowflake, AlertTriangle, Zap, Shield, TrendingUp, Activity } from 'lucide-react';
import { analyzeMatchup, getTeamLogo } from '../utils';

interface TeamDashboardProps {
  teams: TeamStats[];
  matches: ProcessedMatch[];
}

const TeamDashboard: React.FC<TeamDashboardProps> = ({ teams, matches }) => {
  const [selectedTeam1, setSelectedTeam1] = useState<string>(teams[0]?.name || '');
  const [selectedTeam2, setSelectedTeam2] = useState<string>(teams[1]?.name || '');

  const team1Stats = teams.find(t => t.name === selectedTeam1);
  const team2Stats = teams.find(t => t.name === selectedTeam2);

  const calculateQuarterAvgs = (teamName: string) => {
    const teamMatches = matches.filter(m => m.homeTeam === teamName || m.awayTeam === teamName);
    const sums = [0, 0, 0, 0];
    if (teamMatches.length === 0) return sums;
    
    teamMatches.forEach(m => {
        const isHome = m.homeTeam === teamName;
        const scores = isHome ? m.homeQScores : m.awayQScores;
        scores.forEach((s, i) => {
            if (i < 4) sums[i] += s;
        });
    });
    return sums.map(s => s / teamMatches.length);
  };

  const team1QStats = useMemo(() => calculateQuarterAvgs(selectedTeam1), [selectedTeam1, matches]);
  const team2QStats = useMemo(() => calculateQuarterAvgs(selectedTeam2), [selectedTeam2, matches]);

  // Use shared utility for insights
  const activeInsights = (team1Stats && team2Stats) ? analyzeMatchup(team1Stats, team2Stats) : [];

  // Helper to map insight type to Icon
  const getIcon = (type: string) => {
      switch(type) {
          case 'PACE': return <Zap size={18} />;
          case 'BRICK': return <Snowflake size={18} />;
          case 'FOUL': return <AlertTriangle size={18} />;
          case 'MISMATCH': return <Flame size={18} />;
          case 'DEFENSE': return <Shield size={18} />;
          default: return <TrendingUp size={18} />;
      }
  };
  
  const getAdvancedStats = (stats: TeamStats) => {
      const ortg = stats.avgPace > 0 ? (stats.avgPointsFor / stats.avgPace) * 100 : 0;
      const drtg = stats.avgPace > 0 ? (stats.avgPointsAgainst / stats.avgPace) * 100 : 0;
      const tovPct = (stats.avgTurnovers / (stats.avgFGA + 0.44 * stats.avgFTA + stats.avgTurnovers)) * 100;
      
      return { ortg, drtg, tovPct, netRating: ortg - drtg };
  }

  const getLast5Games = (teamName: string) => {
      return matches
          .filter(m => m.homeTeam === teamName || m.awayTeam === teamName)
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 5)
          .map(m => {
              const isHome = m.homeTeam === teamName;
              const teamScore = isHome ? m.homeScore : m.awayScore;
              const oppScore = isHome ? m.awayScore : m.homeScore;
              const opponent = isHome ? m.awayTeam : m.homeTeam;
              const win = teamScore > oppScore;
              
              return {
                  id: m.id,
                  date: m.date,
                  opponent,
                  result: win ? 'W' : 'L',
                  score: `${teamScore}-${oppScore}`,
                  totalResult: m.result,
                  line: m.line
              }
          });
  }

  if (!team1Stats || !team2Stats) return <div className="text-white">Loading Teams...</div>;

  const t1Adv = getAdvancedStats(team1Stats);
  const t2Adv = getAdvancedStats(team2Stats);
  const t1Last5 = getLast5Games(selectedTeam1);
  const t2Last5 = getLast5Games(selectedTeam2);

  return (
    <div className="space-y-8">
        
        {/* Automatic Insights Section */}
        {activeInsights.length > 0 && (
            <div className="bg-secondary p-6 rounded-xl border border-slate-700 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-accent" />
                    Matchup Signals
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeInsights.map((insight, idx) => (
                        <div key={idx} className={`p-4 rounded-lg border ${insight.color} bg-opacity-10 relative overflow-hidden shadow-sm`}>
                            <div className="flex items-center gap-3 mb-2">
                                {getIcon(insight.type)}
                                <h4 className="font-bold text-sm">{insight.title}</h4>
                            </div>
                            <p className="text-xs opacity-90 leading-relaxed">{insight.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team 1 Selector & Stats */}
            <div className="bg-secondary p-6 rounded-xl border border-slate-700 shadow-md flex flex-col h-full">
                <div className="mb-6">
                    <label className="text-xs font-bold text-textMuted uppercase tracking-wider block mb-3">Team A</label>
                    <div className="flex items-center gap-4 bg-primary/50 p-3 rounded-lg border border-slate-700/50">
                        <div className="p-2 bg-white/5 rounded-md shrink-0">
                             <img src={getTeamLogo(selectedTeam1)} className="w-10 h-10 object-contain" alt={selectedTeam1} onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                        <select 
                            value={selectedTeam1}
                            onChange={(e) => setSelectedTeam1(e.target.value)}
                            className="w-full bg-transparent text-white text-base font-medium focus:outline-none cursor-pointer [&>option]:bg-primary"
                        >
                            {teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                        </select>
                    </div>
                </div>
                
                 <div className="grid grid-cols-4 gap-3 text-center mb-8">
                    <div className="bg-primary/40 p-3 rounded-lg border border-slate-700/50 hover:bg-primary/60 transition-colors">
                        <div className="text-[10px] text-textMuted uppercase tracking-wider mb-1">ORTG</div>
                        <div className="text-base font-bold text-emerald-400">{t1Adv.ortg.toFixed(1)}</div>
                    </div>
                    <div className="bg-primary/40 p-3 rounded-lg border border-slate-700/50 hover:bg-primary/60 transition-colors">
                         <div className="text-[10px] text-textMuted uppercase tracking-wider mb-1">DRTG</div>
                        <div className="text-base font-bold text-red-400">{t1Adv.drtg.toFixed(1)}</div>
                    </div>
                    <div className="bg-primary/40 p-3 rounded-lg border border-slate-700/50 hover:bg-primary/60 transition-colors">
                         <div className="text-[10px] text-textMuted uppercase tracking-wider mb-1">TOV%</div>
                        <div className="text-base font-bold text-white">{t1Adv.tovPct.toFixed(1)}%</div>
                    </div>
                    <div className="bg-primary/40 p-3 rounded-lg border border-slate-700/50 hover:bg-primary/60 transition-colors">
                         <div className="text-[10px] text-textMuted uppercase tracking-wider mb-1">REB</div>
                        <div className="text-base font-bold text-white">{team1Stats.avgRebounds.toFixed(1)}</div>
                    </div>
                </div>

                <div className="flex-1">
                     <h5 className="text-xs font-bold text-textMuted uppercase mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-2">
                        <Activity size={14} className="text-accent" /> Recent Form (Last 5)
                     </h5>
                     <div className="space-y-2">
                         {t1Last5.map(g => (
                             <div key={g.id} className="flex justify-between items-center text-xs p-3 bg-primary/20 rounded-md border border-slate-700/30 hover:bg-primary/40 transition-colors">
                                 <div className="flex items-center gap-3 w-2/5">
                                     <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-bold ${g.result === 'W' ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'}`}>
                                         {g.result}
                                     </span>
                                     <div className="flex flex-col overflow-hidden">
                                        <span className="text-[10px] text-textMuted leading-none mb-0.5">vs</span>
                                        <span className="truncate font-medium text-white" title={g.opponent}>{g.opponent}</span>
                                     </div>
                                 </div>
                                 <div className="w-1/4 text-center font-mono text-white font-medium">{g.score}</div>
                                 <div className="w-1/3 text-right">
                                     <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${g.totalResult === 'OVER' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : g.totalResult === 'UNDER' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                         {g.totalResult} {g.line}
                                     </span>
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>
            </div>

            {/* Team 2 Selector & Stats */}
            <div className="bg-secondary p-6 rounded-xl border border-slate-700 shadow-md flex flex-col h-full">
                <div className="mb-6">
                    <label className="text-xs font-bold text-textMuted uppercase tracking-wider block mb-3">Team B</label>
                    <div className="flex items-center gap-4 bg-primary/50 p-3 rounded-lg border border-slate-700/50">
                        <div className="p-2 bg-white/5 rounded-md shrink-0">
                             <img src={getTeamLogo(selectedTeam2)} className="w-10 h-10 object-contain" alt={selectedTeam2} onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                        <select 
                            value={selectedTeam2}
                            onChange={(e) => setSelectedTeam2(e.target.value)}
                            className="w-full bg-transparent text-white text-base font-medium focus:outline-none cursor-pointer [&>option]:bg-primary"
                        >
                            {teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-center mb-8">
                    <div className="bg-primary/40 p-3 rounded-lg border border-slate-700/50 hover:bg-primary/60 transition-colors">
                        <div className="text-[10px] text-textMuted uppercase tracking-wider mb-1">ORTG</div>
                        <div className="text-base font-bold text-emerald-400">{t2Adv.ortg.toFixed(1)}</div>
                    </div>
                    <div className="bg-primary/40 p-3 rounded-lg border border-slate-700/50 hover:bg-primary/60 transition-colors">
                         <div className="text-[10px] text-textMuted uppercase tracking-wider mb-1">DRTG</div>
                        <div className="text-base font-bold text-red-400">{t2Adv.drtg.toFixed(1)}</div>
                    </div>
                    <div className="bg-primary/40 p-3 rounded-lg border border-slate-700/50 hover:bg-primary/60 transition-colors">
                         <div className="text-[10px] text-textMuted uppercase tracking-wider mb-1">TOV%</div>
                        <div className="text-base font-bold text-white">{t2Adv.tovPct.toFixed(1)}%</div>
                    </div>
                     <div className="bg-primary/40 p-3 rounded-lg border border-slate-700/50 hover:bg-primary/60 transition-colors">
                         <div className="text-[10px] text-textMuted uppercase tracking-wider mb-1">REB</div>
                        <div className="text-base font-bold text-white">{team2Stats.avgRebounds.toFixed(1)}</div>
                    </div>
                </div>

                <div className="flex-1">
                     <h5 className="text-xs font-bold text-textMuted uppercase mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-2">
                        <Activity size={14} className="text-accent" /> Recent Form (Last 5)
                     </h5>
                     <div className="space-y-2">
                         {t2Last5.map(g => (
                             <div key={g.id} className="flex justify-between items-center text-xs p-3 bg-primary/20 rounded-md border border-slate-700/30 hover:bg-primary/40 transition-colors">
                                 <div className="flex items-center gap-3 w-2/5">
                                     <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-bold ${g.result === 'W' ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'}`}>
                                         {g.result}
                                     </span>
                                     <div className="flex flex-col overflow-hidden">
                                        <span className="text-[10px] text-textMuted leading-none mb-0.5">vs</span>
                                        <span className="truncate font-medium text-white" title={g.opponent}>{g.opponent}</span>
                                     </div>
                                 </div>
                                 <div className="w-1/4 text-center font-mono text-white font-medium">{g.score}</div>
                                 <div className="w-1/3 text-right">
                                     <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${g.totalResult === 'OVER' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : g.totalResult === 'UNDER' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                         {g.totalResult} {g.line}
                                     </span>
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-secondary p-6 rounded-xl border border-slate-700 shadow-md">
                <TeamComparisonRadar team1={team1Stats} team2={team2Stats} />
            </div>
            <div className="bg-secondary p-6 rounded-xl border border-slate-700 shadow-md">
                <TeamQuarterlyChart 
                    team1Name={team1Stats.name} 
                    team1Data={team1QStats}
                    team2Name={team2Stats.name}
                    team2Data={team2QStats}
                />
            </div>
        </div>
    </div>
  );
};

export default TeamDashboard;
