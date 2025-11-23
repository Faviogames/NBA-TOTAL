
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './DataContext';
import Layout from './components/Layout';
import MatchTable from './components/MatchTable';
import { ScoringTrendChart, QuarterlyAvgChart } from './components/Charts';
import TeamDashboard from './components/TeamDashboard';
import BettingSimulator from './components/BettingSimulator';
import { TrendingUp, Activity, Target, Loader2, CalendarClock, Zap, Snowflake, AlertTriangle, Flame, Shield, Info, RefreshCcw, BarChart2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { normalizeTeamName, analyzeMatchup, getTeamLogo, exportLiveGamesToCSV } from './utils';

const LiveGamesGrid = () => {
    const { liveGames, teams, matches, lineMovements } = useData();

    // Calculate League Average from historical data
    const leagueTotal = matches.reduce((sum, m) => sum + m.totalScore, 0);
    const leagueAvg = matches.length > 0 ? leagueTotal / matches.length : 230;
    const REVERSION_MARGIN = 5;

    if (!liveGames || liveGames.length === 0) {
        return (
            <div className="p-8 text-center text-textMuted border border-dashed border-slate-700 rounded-xl">
                No live or upcoming games found from API currently.
            </div>
        );
    }

    // Helper to map insight type to Icon
    const getIcon = (type: string) => {
        switch(type) {
            case 'PACE': return <Zap size={14} />;
            case 'BRICK': return <Snowflake size={14} />;
            case 'FOUL': return <AlertTriangle size={14} />;
            case 'MISMATCH': return <Flame size={14} />;
            case 'DEFENSE': return <Shield size={14} />;
            default: return <Activity size={14} />;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {liveGames.map((game) => {
                const homeStats = teams.find(t => t.name === normalizeTeamName(game.home_team));
                const awayStats = teams.find(t => t.name === normalizeTeamName(game.away_team));
                
                // 1. Team Trends Model Projection
                let projection = 0;
                if (homeStats && awayStats) {
                    projection = (homeStats.avgPointsFor + homeStats.avgPointsAgainst + awayStats.avgPointsFor + awayStats.avgPointsAgainst) / 2;
                }

                // Get Totals Line
                const market = game.bookmakers[0]?.markets.find(m => m.key === 'totals');
                const line = market?.outcomes[0]?.point || 0;
                
                // Check for Line Movement
                const movement = lineMovements[game.id];

                // Edge Calculation (Team Model)
                const edge = line > 0 && projection > 0 ? projection - line : 0;
                
                // 2. League Reversion Strategy Logic
                const deviation = line - leagueAvg;
                const reversionPick = Math.abs(deviation) > REVERSION_MARGIN 
                    ? (deviation > 0 ? 'UNDER' : 'OVER') 
                    : null;

                // Calculate insights if stats available
                const insights = (homeStats && awayStats) ? analyzeMatchup(homeStats, awayStats) : [];

                return (
                    <div key={game.id} className={`bg-primary border rounded-xl p-5 hover:border-accent/50 transition-all group relative ${reversionPick ? 'border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.05)]' : 'border-slate-700'}`}>
                        {/* Hover Overlay for Insights */}
                        {insights.length > 0 && (
                            <div className="absolute inset-0 bg-secondary/95 backdrop-blur-sm p-4 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex flex-col justify-center rounded-xl pointer-events-none">
                                <div className="text-xs font-bold text-textMuted uppercase mb-3 flex items-center gap-2">
                                    <Info size={14} className="text-accent" /> Matchup Signals
                                </div>
                                <div className="space-y-2">
                                    {insights.map((insight, idx) => (
                                        <div key={idx} className={`flex items-center gap-2 text-xs p-2 rounded border bg-primary/50 ${insight.color}`}>
                                            {getIcon(insight.type)}
                                            <span className="font-medium truncate">{insight.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Signal Indicator Badge (Visible before hover) */}
                        {insights.length > 0 && (
                             <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 transition-opacity group-hover:opacity-0">
                                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1 shadow-sm">
                                    <Zap size={10} /> {insights.length} Signals
                                </span>
                             </div>
                        )}


                        <div className="flex justify-between items-start mb-4">
                            <div className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-1">
                                <CalendarClock size={12} />
                                {new Date(game.commence_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            <div className="flex gap-1">
                                {reversionPick && (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-purple-600 text-white border border-purple-400 flex items-center gap-1 animate-pulse">
                                        <BarChart2 size={10} /> League Rev: {reversionPick}
                                    </span>
                                )}
                                {Math.abs(edge) > 3 && !reversionPick && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${edge > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} group-hover:opacity-0 transition-opacity`}>
                                        {edge > 0 ? 'OVER VALUE' : 'UNDER VALUE'}
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-right flex-1 flex items-center justify-end gap-2">
                                <div>
                                    <div className="font-bold text-white">{game.home_team}</div>
                                    <div className="text-xs text-textMuted">{homeStats ? `${homeStats.avgPointsFor.toFixed(1)} PPG` : '-'}</div>
                                </div>
                                <img src={getTeamLogo(game.home_team)} alt={game.home_team} className="w-11 h-11 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            </div>
                            <div className="px-3 text-textMuted text-xs font-bold">vs</div>
                            <div className="text-left flex-1 flex items-center gap-2">
                                <img src={getTeamLogo(game.away_team)} alt={game.away_team} className="w-11 h-11 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                <div>
                                    <div className="font-bold text-white">{game.away_team}</div>
                                    <div className="text-xs text-textMuted">{awayStats ? `${awayStats.avgPointsFor.toFixed(1)} PPG` : '-'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-secondary rounded-lg p-3 grid grid-cols-3 divide-x divide-slate-700 text-center relative">
                            {/* Movement Indicator */}
                            {movement && (
                                <div className={`absolute -top-3 left-4 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center shadow-sm ${movement.direction === 'UP' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    {movement.direction === 'UP' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                    Was {movement.oldLine}
                                </div>
                            )}

                            <div>
                                <div className="text-[10px] text-textMuted uppercase">Line</div>
                                <div className={`text-white font-bold ${movement ? 'text-yellow-200' : ''}`}>{line || '-'}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-textMuted uppercase">Model</div>
                                <div className="text-accent font-bold">{projection ? projection.toFixed(1) : '-'}</div>
                            </div>
                             <div>
                                <div className="text-[10px] text-textMuted uppercase">Edge</div>
                                <div className={`font-bold ${edge > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {projection ? (edge > 0 ? '+' : '') + edge.toFixed(1) : '-'}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    )
}

const Dashboard: React.FC = () => {
  const { matches, refreshLiveOdds, lastUpdated, liveGames, teams } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Quick Stats from historical data just for context
  const totalGames = matches.length;
  const overPct = totalGames > 0 ? ((matches.filter(m => m.result === 'OVER').length / totalGames) * 100).toFixed(1) : '0.0';

  // Calc league avg for display
  const leagueTotal = matches.reduce((sum, m) => sum + m.totalScore, 0);
  const leagueAvg = matches.length > 0 ? leagueTotal / matches.length : 230;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshLiveOdds();
    setIsRefreshing(false);
  };

  const handleExport = () => {
      exportLiveGamesToCSV(liveGames, teams);
  };

  return (
    <div className="space-y-8">
        {/* Welcome / Context */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-800 pb-6">
            <div>
                <h2 className="text-2xl font-bold text-white">Live Market Dashboard</h2>
                <p className="text-textMuted text-sm mt-1">Real-time odds vs. Statistical Projections</p>
            </div>
            <div className="flex items-center gap-4">
                 <div className="flex flex-col items-end">
                    <div className="flex gap-2">
                        <button 
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-secondary hover:bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                        >
                            Export CSV
                        </button>
                        <button 
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 bg-accent hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCcw size={16} className={isRefreshing ? "animate-spin" : ""} />
                            {isRefreshing ? 'Updating...' : 'Refresh Odds'}
                        </button>
                    </div>
                    {lastUpdated && (
                        <span className="text-[10px] text-textMuted mt-1">
                            Updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                 </div>
            </div>
        </div>

        {/* Live Games Grid */}
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Target size={20} className="text-red-500" />
                    Live Betting Opportunities
                </h3>
            </div>
            <LiveGamesGrid />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-secondary p-6 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-white font-semibold">Historical Context</h3>
                     <div className="flex gap-3">
                        <span className="text-xs bg-slate-700 px-2 py-1 rounded text-textMuted">League Over Rate: <span className="text-emerald-400">{overPct}%</span></span>
                        <span className="text-xs bg-slate-700 px-2 py-1 rounded text-textMuted">League Avg Score: <span className="text-white">{leagueAvg.toFixed(1)}</span></span>
                     </div>
                </div>
                <ScoringTrendChart matches={matches} />
            </div>
            <div className="bg-secondary p-6 rounded-xl border border-slate-700 shadow-lg">
                <QuarterlyAvgChart matches={matches} />
            </div>
        </div>
    </div>
  );
}

const AppContent: React.FC = () => {
    const { loading } = useData();

    if (loading) {
        return (
            <div className="h-screen w-full bg-primary flex flex-col items-center justify-center text-white gap-4">
                <Loader2 className="w-10 h-10 text-accent animate-spin" />
                <p className="text-textMuted animate-pulse text-sm tracking-wider">INITIALIZING ANALYTICS ENGINE...</p>
            </div>
        );
    }

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/matches" element={<MatchTable matches={useData().matches} />} />
                <Route path="/analytics" element={<TeamDashboard teams={useData().teams} matches={useData().matches} />} />
                <Route path="/simulator" element={<BettingSimulator matches={useData().matches} teams={useData().teams} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    );
};

const App: React.FC = () => {
  return (
    <HashRouter>
        <DataProvider>
            <AppContent />
        </DataProvider>
    </HashRouter>
  );
};

export default App;
