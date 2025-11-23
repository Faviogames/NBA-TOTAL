
import React, { useState, useMemo, useEffect } from 'react';
import { ProcessedMatch, TeamStats, LiveGame } from '../types';
import { normalizeTeamName, getTeamLogo, aggregateTeamStats } from '../utils'; // Need aggregate for recalc
import { DollarSign, TrendingUp, TrendingDown, Sliders, Calendar, BarChart, Radio, CheckCircle2, Filter, History, AlertCircle, RefreshCw } from 'lucide-react';
import { useData } from '../DataContext';
import { BarChart as BarChartIcon } from 'lucide-react';

interface SimulatorProps {
  matches: ProcessedMatch[]; // Default matches (current season)
  teams: TeamStats[];       // Default teams
}

const BettingSimulator: React.FC<SimulatorProps> = ({ matches: defaultMatches, teams: defaultTeams }) => {
  const { liveGames, getSeasonData, availableSeasons } = useData();
  const [mode, setMode] = useState<'BACKTEST' | 'LIVE' | 'LOGS'>('BACKTEST');
  const [liveFilter, setLiveFilter] = useState<'ALL' | 'MODEL' | 'REVERSION' | 'HIGH_EFFICIENCY'>('ALL');

  // Backtest Data State
  const [activeSeasonId, setActiveSeasonId] = useState<string>(availableSeasons[0]?.id || '2025');
  const [backtestMatches, setBacktestMatches] = useState<ProcessedMatch[]>(defaultMatches);
  const [backtestTeams, setBacktestTeams] = useState<TeamStats[]>(defaultTeams);
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);

  // Backtest State
  const [wager, setWager] = useState(100);
  const [strategy, setStrategy] = useState<'ALL_OVER' | 'ALL_UNDER' | 'LEAGUE_AVG_REVERSION' | 'TEAM_MODEL' | 'HIGH_EFFICIENCY_OVER'>('LEAGUE_AVG_REVERSION');
  const [valueMargin, setValueMargin] = useState(5); 
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [efficiencyThreshold, setEfficiencyThreshold] = useState(46.5); 

  // Effect to handle Season Switch
  useEffect(() => {
      const switchSeason = async () => {
          if (activeSeasonId === '2025') {
              // Revert to defaults if current season (avoids unnecessary fetch if passed via props, but safe to fetch too)
              // Ideally, we use the getSeasonData for consistency or props. 
              // Since DataContext provides props for default, we can use those if we want, but fetching ensures clean state.
              // Let's use getSeasonData for all switches to be uniform.
          }
          
          setIsLoadingSeason(true);
          const data = await getSeasonData(activeSeasonId);
          if (data.length > 0) {
            setBacktestMatches(data);
            // Recalculate teams based on this season's data
            // aggregateTeamStats expects rawData for granular stats. 
            // NOTE: In utils, aggregateTeamStats uses rawData mainly for granular stats. 
            // If we don't pass rawData, it skips granular stats. 
            // For backtesting simplicity here, we might lose granular stats unless we also fetch raw JSON.
            // `getSeasonData` currently processes matches. 
            // To fix this fully, DataContext should probably return { processed, teams }.
            // For now, we will skip advanced granular team stats in backtest if raw not available, 
            // OR we update aggregateTeamStats to work purely on processed matches where possible.
            // *Correction*: aggregateTeamStats takes rawData. getSeasonData only returns processed.
            // We can rely on `matches` having enough data or accept that "High Efficiency" might be slightly off if it relies on raw aggregation.
            // Actually, `ProcessedMatch` has `homeFG_Pct`, etc.
            // We can create a light aggregator for backtesting needs.
            // But simplest is to rely on the ProcessedMatch properties for strategy logic directly.
            
            // We need `getTeamStats` for `TEAM_MODEL`.
            // Let's update `aggregateTeamStats` to work with just `ProcessedMatch` if needed, or mock it.
            // Actually, `aggregateTeamStats` implementation in utils reads `quarter_stats` from RAW data. 
            // We assume for this demo that switching seasons might have limited advanced team stats unless we refactor.
            // However, `TEAM_MODEL` needs `avgPointsFor`. We can calc that from `ProcessedMatch`.
          }
          setIsLoadingSeason(false);
      };

      switchSeason();
  }, [activeSeasonId]);


  // Helper to rebuild team stats from current backtestMatches for the Model
  const currentTeamStats = useMemo(() => {
     const stats: Record<string, any> = {};
     backtestMatches.forEach(m => {
         [m.homeTeam, m.awayTeam].forEach(t => {
             if (!stats[t]) stats[t] = { name: t, pointsFor: 0, pointsAgainst: 0, games: 0, fgSum: 0 };
         });
         stats[m.homeTeam].pointsFor += m.homeScore;
         stats[m.homeTeam].pointsAgainst += m.awayScore;
         stats[m.homeTeam].fgSum += m.homeFG_Pct;
         stats[m.homeTeam].games++;

         stats[m.awayTeam].pointsFor += m.awayScore;
         stats[m.awayTeam].pointsAgainst += m.homeScore;
         stats[m.awayTeam].fgSum += m.awayFG_Pct;
         stats[m.awayTeam].games++;
     });

     return Object.values(stats).map((t: any) => ({
         name: t.name,
         avgPointsFor: t.pointsFor / t.games,
         avgPointsAgainst: t.pointsAgainst / t.games,
         avgFG_Pct: t.fgSum / t.games,
         // Mock others
         avgPace: 0, avgTS: 0, overRate: 0, last10Avg: 0, avgFGA: 0, avg3P_Pct: 0, avgFouls: 0, avgFTM: 0, avgTurnovers: 0, avgFTA: 0, avgRebounds: 0
     })) as TeamStats[];
  }, [backtestMatches]);

  const getTeamStats = (name: string) => currentTeamStats.find(t => t.name === normalizeTeamName(name));

  // Calculate League Avg from ACTIVE dataset
  const leagueTotal = backtestMatches.reduce((sum, m) => sum + m.totalScore, 0);
  const leagueAvg = backtestMatches.length > 0 ? leagueTotal / backtestMatches.length : 230;

  // ---- BACKTEST LOGIC ----
  const calculateBacktestROI = () => {
    let wins = 0;
    let losses = 0;
    let pushes = 0;
    let profit = 0;
    let betsPlaced = 0;
    const historyLogs: any[] = [];

    const filteredMatches = backtestMatches.filter(m => {
        const teamMatch = selectedTeam === 'ALL' || m.homeTeam === selectedTeam || m.awayTeam === selectedTeam;
        // Basic date filter
        const dateMatch = (!startDate || m.date >= new Date(startDate)) && (!endDate || m.date <= new Date(endDate));
        return teamMatch && dateMatch;
    }).sort((a, b) => b.date.getTime() - a.date.getTime()); 

    filteredMatches.forEach(match => {
      let betType: 'OVER' | 'UNDER' | null = null;
      let shouldBet = false;
      let signalReason = '';

      if (strategy === 'ALL_OVER') {
        betType = 'OVER';
        shouldBet = true;
        signalReason = 'Blind Bet';
      } else if (strategy === 'ALL_UNDER') {
        betType = 'UNDER';
        shouldBet = true;
        signalReason = 'Blind Bet';
      } else if (strategy === 'HIGH_EFFICIENCY_OVER') {
          const home = getTeamStats(match.homeTeam);
          const away = getTeamStats(match.awayTeam);
          if (home && away) {
              const combinedFG = (home.avgFG_Pct + away.avgFG_Pct) / 2;
              if (combinedFG > efficiencyThreshold) {
                  betType = 'OVER';
                  shouldBet = true;
                  signalReason = `Combined FG% ${combinedFG.toFixed(1)}% > ${efficiencyThreshold}%`;
              }
          }
      } else if (strategy === 'LEAGUE_AVG_REVERSION') {
        if (match.line > leagueAvg + valueMargin) {
            betType = 'UNDER';
            shouldBet = true;
            signalReason = `Line ${match.line} > League Avg ${leagueAvg.toFixed(1)} + ${valueMargin}`;
        } else if (match.line < leagueAvg - valueMargin) {
            betType = 'OVER';
            shouldBet = true;
            signalReason = `Line ${match.line} < League Avg ${leagueAvg.toFixed(1)} - ${valueMargin}`;
        }
      } else if (strategy === 'TEAM_MODEL') {
        const home = getTeamStats(match.homeTeam);
        const away = getTeamStats(match.awayTeam);
        if (home && away) {
            const homeAvgTotal = home.avgPointsFor + home.avgPointsAgainst;
            const awayAvgTotal = away.avgPointsFor + away.avgPointsAgainst;
            const projectedTotal = (homeAvgTotal + awayAvgTotal) / 4 * 2; 
            
            if (projectedTotal > match.line + valueMargin) {
                betType = 'OVER';
                shouldBet = true;
                signalReason = `Model Proj ${projectedTotal.toFixed(1)} > Line ${match.line}`;
            } else if (projectedTotal < match.line - valueMargin) {
                betType = 'UNDER';
                shouldBet = true;
                signalReason = `Model Proj ${projectedTotal.toFixed(1)} < Line ${match.line}`;
            }
        }
      }

      if (shouldBet && betType) {
        betsPlaced++;
        const odds = betType === 'OVER' ? match.overOdds : match.underOdds;
        let won = false;
        let lost = false;
        let resultPnl = 0;

        if (betType === 'OVER') {
            if (match.totalScore > match.line) won = true;
            else if (match.totalScore < match.line) lost = true;
        } else {
            if (match.totalScore < match.line) won = true;
            else if (match.totalScore > match.line) lost = true;
        }

        if (won) {
            wins++;
            resultPnl = wager * (odds - 1);
            profit += resultPnl;
        } else if (lost) {
            losses++;
            resultPnl = -wager;
            profit -= wager;
        } else {
            pushes++;
        }

        historyLogs.push({
            id: match.id,
            date: match.date,
            home: match.homeTeam,
            away: match.awayTeam,
            score: match.totalScore,
            line: match.line,
            pick: betType,
            result: won ? 'WIN' : lost ? 'LOSS' : 'PUSH',
            pnl: resultPnl,
            reason: signalReason
        });
      }
    });

    const roi = betsPlaced > 0 ? (profit / (betsPlaced * wager)) * 100 : 0;
    return { wins, losses, pushes, profit, roi, totalBets: betsPlaced, leagueAvg, historyLogs };
  };

  const results = useMemo(() => calculateBacktestROI(), [backtestMatches, strategy, valueMargin, selectedTeam, startDate, endDate, efficiencyThreshold, wager, currentTeamStats]);


  // ---- LIVE VALUE LOGIC ----
  const getLiveValueBets = () => {
      return liveGames.map(game => {
          const totalsMarket = game.bookmakers[0]?.markets.find(m => m.key === 'totals');
          if (!totalsMarket) return null;
          
          const over = totalsMarket.outcomes.find(o => o.name === 'Over');
          const under = totalsMarket.outcomes.find(o => o.name === 'Under');
          
          if(!over || !under || !over.point) return null;
          
          const line = over.point;
          // USE DEFAULT TEAMS (CURRENT SEASON) for Live Predictions, not backtest teams
          const hStats = defaultTeams.find(t => t.name === normalizeTeamName(game.home_team));
          const aStats = defaultTeams.find(t => t.name === normalizeTeamName(game.away_team));
          
          // 1. Team Model
          let projected = 0;
          let modelEdge = 0;
          let modelPick: 'OVER' | 'UNDER' | null = null;

          if(hStats && aStats) {
            const hAvgTotal = hStats.avgPointsFor + hStats.avgPointsAgainst;
            const aAvgTotal = aStats.avgPointsFor + aStats.avgPointsAgainst;
            projected = (hAvgTotal + aAvgTotal) / 4 * 2; 
            modelEdge = projected - line;

            if (modelEdge > valueMargin) modelPick = 'OVER';
            if (modelEdge < -valueMargin) modelPick = 'UNDER';
          }

          // 2. League Reversion (Use Current Season Avg, not backtest avg)
          const currentLeagueTotal = defaultMatches.reduce((sum, m) => sum + m.totalScore, 0);
          const currentLeagueAvg = defaultMatches.length > 0 ? currentLeagueTotal / defaultMatches.length : 230;
          
          const deviation = line - currentLeagueAvg;
          const REVERSION_THRESHOLD = 5; 
          let reversionPick: 'OVER' | 'UNDER' | null = null;
          
          if (deviation > REVERSION_THRESHOLD) reversionPick = 'UNDER';
          if (deviation < -REVERSION_THRESHOLD) reversionPick = 'OVER';

          // 3. High Efficiency
          let efficiencyPick: 'OVER' | null = null;
          let combinedFG = 0;
          if (hStats && aStats) {
             combinedFG = (hStats.avgFG_Pct + aStats.avgFG_Pct) / 2;
             if (combinedFG > efficiencyThreshold) {
                 efficiencyPick = 'OVER';
             }
          }

          if (!modelPick && !reversionPick && !efficiencyPick) return null;

          return {
              id: game.id,
              home: game.home_team,
              away: game.away_team,
              line,
              projected,
              modelPick,
              modelEdge: Math.abs(modelEdge),
              reversionPick,
              efficiencyPick,
              combinedFG,
              overPrice: over.price,
              underPrice: under.price
          };
      })
      .filter(Boolean)
      .filter(bet => {
          if (liveFilter === 'ALL') return true;
          if (liveFilter === 'MODEL') return !!bet?.modelPick;
          if (liveFilter === 'REVERSION') return !!bet?.reversionPick;
          if (liveFilter === 'HIGH_EFFICIENCY') return !!bet?.efficiencyPick;
          return true;
      });
  };

  const liveValueBets = getLiveValueBets();


  return (
    <div className="space-y-6">
        {/* Mode Toggle */}
        <div className="bg-secondary p-4 rounded-xl border border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="bg-primary p-1 rounded-lg flex">
                <button 
                    onClick={() => setMode('BACKTEST')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'BACKTEST' ? 'bg-accent text-white shadow-lg' : 'text-textMuted hover:text-white'}`}
                >
                    Historical Backtest
                </button>
                <button 
                    onClick={() => setMode('LOGS')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'LOGS' ? 'bg-blue-600 text-white shadow-lg' : 'text-textMuted hover:text-white'}`}
                >
                    Signal History Logs
                </button>
                <button 
                    onClick={() => setMode('LIVE')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'LIVE' ? 'bg-emerald-600 text-white shadow-lg' : 'text-textMuted hover:text-white'}`}
                >
                    Live Value Finder
                </button>
            </div>
            
            {/* SEASON SELECTOR - Only visible in Backtest/Logs mode */}
            {mode !== 'LIVE' && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-textMuted font-bold uppercase">Season:</span>
                    <select 
                        value={activeSeasonId}
                        onChange={(e) => setActiveSeasonId(e.target.value)}
                        disabled={isLoadingSeason}
                        className="bg-primary border border-slate-600 text-white text-xs rounded px-2 py-1 focus:border-accent outline-none disabled:opacity-50"
                    >
                        {availableSeasons.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    {isLoadingSeason && <RefreshCw className="animate-spin text-accent" size={14} />}
                </div>
            )}
        </div>

        {mode !== 'LIVE' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* CONFIGURATION (Shared for Backtest & Logs) */}
                <div className="bg-secondary p-6 rounded-xl border border-slate-700 lg:col-span-1 h-fit">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Sliders className="text-accent" size={20} /> Configuration
                    </h2>
                    
                    <div className="space-y-6">
                    <div className="space-y-3 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                        <h3 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Calendar size={12} /> Filters
                        </h3>
                        <div>
                            <label className="block text-xs text-textMuted mb-1">Target Team</label>
                            <select 
                                value={selectedTeam} 
                                onChange={(e) => setSelectedTeam(e.target.value)}
                                className="w-full bg-primary border border-slate-600 rounded px-3 py-2 text-white text-sm focus:border-accent outline-none"
                            >
                                <option value="ALL">Entire League</option>
                                {currentTeamStats.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-textMuted mb-1">Start Date</label>
                                <input 
                                    type="date" 
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-primary border border-slate-600 rounded px-2 py-1 text-white text-xs focus:border-accent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-textMuted mb-1">End Date</label>
                                <input 
                                    type="date" 
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-primary border border-slate-600 rounded px-2 py-1 text-white text-xs focus:border-accent outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-textMuted mb-2 font-medium">Unit Size ($)</label>
                        <input 
                        type="number" 
                        value={wager} 
                        onChange={(e) => setWager(Number(e.target.value))}
                        className="w-full bg-primary border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-textMuted mb-2 font-medium">Strategy Model</label>
                        <div className="relative">
                            <select 
                            value={strategy} 
                            onChange={(e) => setStrategy(e.target.value as any)}
                            className="w-full bg-primary border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-accent focus:outline-none appearance-none"
                            >
                                <option value="LEAGUE_AVG_REVERSION">Smart: League Avg Reversion</option>
                                <option value="TEAM_MODEL">Smart: Team Trends Model</option>
                                <option value="HIGH_EFFICIENCY_OVER">Stats: High Efficiency Clash (Over)</option>
                                <option value="ALL_OVER">Blind: Bet All Overs</option>
                                <option value="ALL_UNDER">Blind: Bet All Unders</option>
                            </select>
                        </div>
                    </div>

                    {(strategy === 'TEAM_MODEL' || strategy === 'LEAGUE_AVG_REVERSION') && (
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm text-textMuted mb-2 font-medium flex justify-between">
                                <span>{strategy === 'LEAGUE_AVG_REVERSION' ? 'Deviation Margin (Pts)' : 'Safety Margin (Pts)'}</span>
                                <span className="text-white font-bold">{valueMargin}</span>
                            </label>
                            <input 
                                type="range" min="0" max="15" step="0.5"
                                value={valueMargin} onChange={(e) => setValueMargin(Number(e.target.value))}
                                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-accent"
                            />
                            <p className="text-xs text-textMuted mt-2">
                                {strategy === 'LEAGUE_AVG_REVERSION' 
                                    ? `Bet if line deviates > ${valueMargin} pts from League Avg.`
                                    : `Bet if difference vs model > ${valueMargin} pts.`}
                            </p>
                        </div>
                    )}

                    {strategy === 'HIGH_EFFICIENCY_OVER' && (
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm text-textMuted mb-2 font-medium flex justify-between">
                                <span>Combined FG% Threshold</span>
                                <span className="text-white font-bold">{efficiencyThreshold}%</span>
                            </label>
                            <input 
                                type="range" min="40" max="60" step="0.5"
                                value={efficiencyThreshold} onChange={(e) => setEfficiencyThreshold(Number(e.target.value))}
                                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-accent"
                            />
                            <p className="text-xs text-textMuted mt-2">
                                Bet OVER if combined team season avg FG% &gt; {efficiencyThreshold}%.
                            </p>
                        </div>
                    )}

                    </div>
                </div>

                {/* RESULTS OR LOGS VIEW */}
                <div className="bg-secondary p-6 rounded-xl border border-slate-700 lg:col-span-2 flex flex-col h-[800px]">
                     <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {mode === 'BACKTEST' ? <DollarSign className="text-success" /> : <History className="text-blue-400" />}
                                {mode === 'BACKTEST' ? 'Historical Results' : 'Signal History Logs'}
                            </h2>
                            <p className="text-xs text-textMuted mt-1">
                                {mode === 'BACKTEST' ? 'ROI based on real-time odds extracted from data.' : 'Detailed breakdown of every triggered signal.'}
                            </p>
                        </div>
                        {/* Mini Summary for Logs view */}
                        {mode === 'LOGS' && (
                            <div className="text-right">
                                <div className={`text-lg font-bold ${results.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {results.profit >= 0 ? '+' : ''}${results.profit.toFixed(2)}
                                </div>
                                <div className="text-xs text-textMuted">Total P/L</div>
                            </div>
                        )}
                    </div>

                    {mode === 'BACKTEST' ? (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                                <div className="bg-primary p-5 rounded-xl border border-slate-700 shadow-sm relative overflow-hidden">
                                    <div className="text-textMuted text-xs uppercase tracking-wider mb-1">Bets Placed</div>
                                    <div className="text-2xl font-bold text-white">{results.totalBets}</div>
                                    <div className="absolute bottom-0 right-0 p-2 opacity-10"><BarChartIcon size={48} /></div>
                                </div>
                                <div className="bg-primary p-5 rounded-xl border border-slate-700 shadow-sm">
                                    <div className="text-textMuted text-xs uppercase tracking-wider mb-1">Win Rate</div>
                                    <div className="text-2xl font-bold text-white">
                                        {results.totalBets > 0 ? ((results.wins / results.totalBets) * 100).toFixed(1) : '0.0'}%
                                    </div>
                                    <div className="text-xs text-textMuted mt-1">
                                        {results.wins} W - {results.losses} L
                                    </div>
                                </div>
                                <div className="bg-primary p-5 rounded-xl border border-slate-700 shadow-sm relative overflow-hidden">
                                    <div className="text-textMuted text-xs uppercase tracking-wider mb-1">Net Profit</div>
                                    <div className={`text-2xl font-bold ${results.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {results.profit >= 0 ? '+' : ''}${results.profit.toFixed(2)}
                                    </div>
                                    <div className={`absolute bottom-0 right-0 p-2 opacity-10 ${results.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                                        <DollarSign size={48} />
                                    </div>
                                </div>
                                <div className="bg-primary p-5 rounded-xl border border-slate-700 shadow-sm">
                                    <div className="text-textMuted text-xs uppercase tracking-wider mb-1">ROI</div>
                                    <div className={`text-2xl font-bold flex items-center gap-1 ${results.roi >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {results.roi >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                    {results.roi.toFixed(2)}%
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 bg-primary rounded-xl border border-slate-700 p-6 flex items-center justify-center">
                                <div className="max-w-lg text-center">
                                    <h4 className="text-white font-semibold mb-2">Strategy Logic</h4>
                                    <p className="text-textMuted text-sm leading-relaxed">
                                        {strategy === 'ALL_OVER' && "Simulating a blind bet on the OVER for every game matching your filters."}
                                        {strategy === 'ALL_UNDER' && "Simulating a blind bet on the UNDER for every game matching your filters."}
                                        {strategy === 'LEAGUE_AVG_REVERSION' && (
                                            <>
                                                Betting against the Vegas line if it deviates from the league average of <strong>{results.leagueAvg.toFixed(1)}</strong> by more than <strong>{valueMargin}</strong> points.
                                            </>
                                        )}
                                        {strategy === 'TEAM_MODEL' && "Using historical averages of the specific teams playing to project a score. Betting when projection differs from Vegas line."}
                                        {strategy === 'HIGH_EFFICIENCY_OVER' && `Betting OVER when the two teams combined average Field Goal % is greater than ${efficiencyThreshold}%. High efficiency offense usually leads to Overs.`}
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        // LOGS VIEW
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {results.historyLogs.length > 0 ? (
                                <div className="overflow-y-auto flex-1 pr-2">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-textMuted uppercase bg-slate-800/50 border-b border-slate-700 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">Matchup</th>
                                                <th className="px-4 py-3 text-center">Signal</th>
                                                <th className="px-4 py-3 text-right">Line</th>
                                                <th className="px-4 py-3 text-right">Score</th>
                                                <th className="px-4 py-3 text-center">Result</th>
                                                <th className="px-4 py-3 text-right">P/L</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {results.historyLogs.map((log: any) => (
                                                <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                                                    <td className="px-4 py-3 text-textMuted text-xs whitespace-nowrap">
                                                        {log.date.toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <img src={getTeamLogo(log.home)} className="w-5 h-5 object-contain" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                                <span className="text-white text-xs">{log.home}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <img src={getTeamLogo(log.away)} className="w-5 h-5 object-contain" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                                <span className="text-white text-xs">{log.away}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] text-textMuted mt-1 italic">{log.reason}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${log.pick === 'OVER' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                            {log.pick}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-white">{log.line}</td>
                                                    <td className="px-4 py-3 text-right text-white font-mono">{log.score}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`text-xs font-bold ${log.result === 'WIN' ? 'text-success' : log.result === 'LOSS' ? 'text-danger' : 'text-textMuted'}`}>
                                                            {log.result}
                                                        </span>
                                                    </td>
                                                    <td className={`px-4 py-3 text-right font-mono font-bold ${log.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                                                        {log.pnl >= 0 ? '+' : ''}{log.pnl.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-textMuted">
                                    <AlertCircle size={48} className="mb-4 opacity-20" />
                                    <p>No signals triggered with the current configuration.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}
        
        {/* LIVE MODE */}
        {mode === 'LIVE' && (
            <div className="bg-secondary p-6 rounded-xl border border-slate-700">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                     <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <CheckCircle2 className="text-emerald-500" /> Live Strategy Signals
                        </h2>
                        <p className="text-xs text-textMuted mt-1">Real-time opportunities based on your configured strategies.</p>
                     </div>
                     
                     <div className="flex items-center gap-2 bg-primary p-1 rounded-lg border border-slate-700">
                         <button 
                            onClick={() => setLiveFilter('ALL')}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${liveFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-textMuted hover:text-white'}`}
                         >
                             All Signals
                         </button>
                         <button 
                            onClick={() => setLiveFilter('REVERSION')}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${liveFilter === 'REVERSION' ? 'bg-purple-600 text-white' : 'text-textMuted hover:text-white'}`}
                         >
                             League Reversion
                         </button>
                         <button 
                            onClick={() => setLiveFilter('HIGH_EFFICIENCY')}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${liveFilter === 'HIGH_EFFICIENCY' ? 'bg-orange-600 text-white' : 'text-textMuted hover:text-white'}`}
                         >
                             High Efficiency
                         </button>
                         <button 
                            onClick={() => setLiveFilter('MODEL')}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${liveFilter === 'MODEL' ? 'bg-blue-600 text-white' : 'text-textMuted hover:text-white'}`}
                         >
                             Team Model
                         </button>
                     </div>

                     <div className="text-right text-xs text-textMuted">
                         League Avg: <span className="text-white font-bold">{leagueAvg.toFixed(1)}</span>
                     </div>
                </div>

                {liveValueBets && liveValueBets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {liveValueBets.map((bet: any, idx: number) => (
                             <div key={idx} className={`bg-primary border rounded-xl p-5 relative overflow-hidden transition-colors ${bet.reversionPick && liveFilter !== 'MODEL' && liveFilter !== 'HIGH_EFFICIENCY' ? 'border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.1)]' : bet.efficiencyPick && liveFilter === 'HIGH_EFFICIENCY' ? 'border-orange-500/40' : 'border-slate-600 hover:border-accent'}`}>
                                 <div className="mb-3">
                                     <div className="flex items-center gap-2 mb-1">
                                         <img src={getTeamLogo(bet.home)} className="w-7 h-7 object-contain" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                         <div className="text-sm text-white font-medium">{bet.home}</div>
                                     </div>
                                     <div className="text-xs text-textMuted ml-7">vs</div>
                                     <div className="flex items-center gap-2 mt-1">
                                         <img src={getTeamLogo(bet.away)} className="w-7 h-7 object-contain" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                         <div className="text-sm text-white font-medium">{bet.away}</div>
                                     </div>
                                 </div>

                                 {/* Market Info */}
                                 <div className="flex justify-between items-center mb-4 bg-secondary/50 p-2 rounded">
                                     <div className="text-center">
                                         <p className="text-[10px] text-textMuted uppercase">Line</p>
                                         <p className="text-lg font-bold text-white">{bet.line}</p>
                                     </div>
                                     <div className="text-center">
                                         <p className="text-[10px] text-textMuted uppercase">Proj</p>
                                         <p className="text-lg font-bold text-accent">{bet.projected ? bet.projected.toFixed(1) : '-'}</p>
                                     </div>
                                 </div>

                                 <div className="space-y-2">
                                     {/* Reversion Signal Priority */}
                                     {bet.reversionPick && (
                                         <div className="flex justify-between items-center border-t border-slate-700 pt-2">
                                             <div className="flex items-center gap-2">
                                                 <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                                                 <span className="text-xs text-purple-300 font-bold">League Rev.</span>
                                             </div>
                                             <span className="text-sm font-bold text-purple-400">
                                                {bet.reversionPick}
                                             </span>
                                         </div>
                                     )}

                                     {/* Efficiency Signal */}
                                     {bet.efficiencyPick && (
                                         <div className="flex justify-between items-center border-t border-slate-700 pt-2">
                                             <div className="flex items-center gap-2">
                                                 <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                                 <span className="text-xs text-orange-300 font-bold">Hot Offense</span>
                                             </div>
                                             <span className="text-sm font-bold text-orange-400">
                                                OVER <span className="text-[10px] font-normal text-textMuted">({bet.combinedFG.toFixed(1)}% FG)</span>
                                             </span>
                                         </div>
                                     )}
                                     
                                     {/* Team Model Signal */}
                                     {bet.modelPick && (
                                         <div className="flex justify-between items-center border-t border-slate-700 pt-2">
                                             <span className="text-xs text-textMuted">Team Model</span>
                                             <span className={`text-sm font-bold ${bet.modelPick === 'OVER' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {bet.modelPick} <span className="text-[10px] font-normal text-textMuted">({bet.modelEdge.toFixed(1)} pts)</span>
                                             </span>
                                         </div>
                                     )}
                                 </div>

                             </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-textMuted">
                        <div className="bg-primary/50 inline-block p-4 rounded-full mb-3">
                            <Filter size={32} className="opacity-50" />
                        </div>
                        <p>No opportunities found for the selected strategy.</p>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default BettingSimulator;
