
import React, { useState, useMemo, useEffect } from 'react';
import { ProcessedMatch } from '../types';
import { generateMatchInsights, getTeamLogo, calculateMarketInsights } from '../utils';
import { ArrowUp, ArrowDown, Filter, ChevronDown, ChevronUp, Zap, Activity, TrendingUp, AlertTriangle, ChevronLeft, ChevronRight, Clock, AlertOctagon, Target, Flame, Shield } from 'lucide-react';

interface MatchTableProps {
  matches: ProcessedMatch[];
}

const MatchTable: React.FC<MatchTableProps> = ({ matches }) => {
  const [sortField, setSortField] = useState<keyof ProcessedMatch>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterText, setFilterText] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Market Insights
  const marketInsights = useMemo(() => calculateMarketInsights(matches), [matches]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterText]);

  const handleSort = (field: keyof ProcessedMatch) => {
    if (field === sortField) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredMatches = matches.filter(
    (m) =>
      m.homeTeam.toLowerCase().includes(filterText.toLowerCase()) ||
      m.awayTeam.toLowerCase().includes(filterText.toLowerCase())
  );

  const sortedMatches = [...filteredMatches].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination Logic
  const totalPages = Math.ceil(sortedMatches.length / itemsPerPage);
  const paginatedMatches = sortedMatches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const SortIcon = ({ field }: { field: keyof ProcessedMatch }) => {
    if (sortField !== field) return <div className="w-4 h-4 opacity-0" />;
    return sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="space-y-6">
        {/* Market Insights Dashboard */}
        {matches.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Bookie Nightmare */}
                <div className="bg-secondary border border-slate-700 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-red-500/10 rounded-lg text-red-400">
                        <AlertOctagon size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Bookie Nightmare</p>
                        <div className="flex items-center gap-2 mt-1">
                            <img src={getTeamLogo(marketInsights.nightmares?.name || '')} className="w-6 h-6 object-contain" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            <p className="text-sm font-bold text-white">{marketInsights.nightmares?.name}</p>
                        </div>
                        <p className="text-xs text-red-400 mt-1 font-medium">Avg Miss: ±{marketInsights.nightmares?.avgDiff.toFixed(1)} pts</p>
                    </div>
                </div>

                {/* Sharpest Lines */}
                <div className="bg-secondary border border-slate-700 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
                        <Target size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Sharpest Lines</p>
                        <div className="flex items-center gap-2 mt-1">
                            <img src={getTeamLogo(marketInsights.sharps?.name || '')} className="w-6 h-6 object-contain" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            <p className="text-sm font-bold text-white">{marketInsights.sharps?.name}</p>
                        </div>
                         <p className="text-xs text-emerald-400 mt-1 font-medium">Avg Miss: ±{marketInsights.sharps?.avgDiff.toFixed(1)} pts</p>
                    </div>
                </div>

                {/* Over Kings */}
                <div className="bg-secondary border border-slate-700 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-orange-500/10 rounded-lg text-orange-400">
                        <Flame size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Over Kings</p>
                        <div className="flex items-center gap-2 mt-1">
                            <img src={getTeamLogo(marketInsights.overKings?.name || '')} className="w-6 h-6 object-contain" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            <p className="text-sm font-bold text-white">{marketInsights.overKings?.name}</p>
                        </div>
                        <p className="text-xs text-orange-400 mt-1 font-medium">{marketInsights.overKings?.overPct.toFixed(1)}% Overs</p>
                    </div>
                </div>

                {/* Under Dogs */}
                <div className="bg-secondary border border-slate-700 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                        <Shield size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Under Dogs</p>
                        <div className="flex items-center gap-2 mt-1">
                             <img src={getTeamLogo(marketInsights.underKings?.name || '')} className="w-6 h-6 object-contain" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            <p className="text-sm font-bold text-white">{marketInsights.underKings?.name}</p>
                        </div>
                        <p className="text-xs text-blue-400 mt-1 font-medium">{(100 - (marketInsights.underKings?.overPct || 0)).toFixed(1)}% Unders</p>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-secondary rounded-xl shadow-lg border border-slate-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Filter size={18} className="text-accent" />
            Odds History
            </h2>
            <input
            type="text"
            placeholder="Search Team..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="bg-primary border border-slate-600 text-white px-4 py-2 rounded-md focus:outline-none focus:border-accent text-sm w-full sm:w-64"
            />
        </div>
        
        <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
            <thead className="text-xs text-textMuted uppercase bg-slate-800/50 border-b border-slate-700">
                <tr>
                <th className="px-6 py-3"></th>
                <th onClick={() => handleSort('date')} className="px-6 py-3 cursor-pointer hover:text-accent">
                    <div className="flex items-center gap-1">Date <SortIcon field="date" /></div>
                </th>
                <th className="px-6 py-3">Matchup</th>
                <th onClick={() => handleSort('totalScore')} className="px-6 py-3 cursor-pointer hover:text-accent text-right">
                    <div className="flex items-center justify-end gap-1">Total <SortIcon field="totalScore" /></div>
                </th>
                <th onClick={() => handleSort('line')} className="px-6 py-3 cursor-pointer hover:text-accent text-right">
                    <div className="flex items-center justify-end gap-1">Line <SortIcon field="line" /></div>
                </th>
                <th className="px-6 py-3 text-center">Result</th>
                <th onClick={() => handleSort('diff')} className="px-6 py-3 cursor-pointer hover:text-accent text-right">
                    <div className="flex items-center justify-end gap-1">Line Value <SortIcon field="diff" /></div>
                </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
                {paginatedMatches.map((match) => {
                    const isExpanded = expandedRow === match.id;
                    
                    return (
                    <React.Fragment key={match.id}>
                        <tr 
                            className={`transition-colors cursor-pointer ${isExpanded ? 'bg-slate-700/50' : 'hover:bg-slate-700/30'}`}
                            onClick={() => toggleRow(match.id)}
                        >
                            <td className="px-6 py-4 text-textMuted">
                                {isExpanded ? <ChevronUp size={16} className="text-accent" /> : <ChevronDown size={16} />}
                            </td>
                            <td className="px-6 py-4 text-textMuted whitespace-nowrap">
                            {match.date.toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 font-medium text-white">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <img src={getTeamLogo(match.homeTeam)} className="w-7 h-7 object-contain" alt="" />
                                    <span className="text-accent">{match.homeTeam} <span className="text-textMuted text-xs">({match.homeScore})</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <img src={getTeamLogo(match.awayTeam)} className="w-7 h-7 object-contain" alt="" />
                                    <span>{match.awayTeam} <span className="text-textMuted text-xs">({match.awayScore})</span></span>
                                </div>
                            </div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-white">
                            <div className="flex items-center justify-end gap-2">
                                {match.isOT ? (
                                    <span title={`Final: ${match.totalScore}`}>{match.regulationTotal}</span>
                                ) : (
                                    match.totalScore
                                )}
                                {match.isOT && (
                                <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded flex items-center gap-1" title="Overtime">
                                    <Clock size={10} /> OT
                                </span>
                                )}
                            </div>
                            </td>
                            <td className="px-6 py-4 text-right text-textMuted">
                            {match.line}
                            </td>
                            <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                match.result === 'OVER' 
                                ? 'bg-success/20 text-success border border-success/30' 
                                : match.result === 'UNDER' 
                                    ? 'bg-danger/20 text-danger border border-danger/30' 
                                    : 'bg-slate-600 text-white'
                            }`}>
                                {match.result}
                            </span>
                            </td>
                            <td className={`px-6 py-4 text-right font-mono ${match.diff > 0 ? 'text-success' : 'text-danger'}`}>
                            {match.diff > 0 ? '+' : ''}{match.diff.toFixed(1)}
                            </td>
                        </tr>
                        {isExpanded && (
                            <MatchInsightsRow match={match} allMatches={matches} />
                        )}
                    </React.Fragment>
                    );
                })}
            </tbody>
            </table>
        </div>
        
        {/* Pagination Controls */}
        {sortedMatches.length > 0 ? (
            <div className="p-4 border-t border-slate-700 flex justify-between items-center bg-slate-800/30">
            <div className="text-xs text-textMuted">
                Showing <span className="text-white font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-white font-medium">{Math.min(currentPage * itemsPerPage, sortedMatches.length)}</span> of <span className="text-white font-medium">{sortedMatches.length}</span> matches
            </div>
            <div className="flex gap-2">
                <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-md bg-primary border border-slate-600 text-textMuted hover:text-white hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                <ChevronLeft size={16} />
                </button>
                <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-md bg-primary border border-slate-600 text-textMuted hover:text-white hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                <ChevronRight size={16} />
                </button>
            </div>
            </div>
        ) : (
            <div className="p-8 text-center text-textMuted">
            No matches found based on your filters.
            </div>
        )}
        </div>
    </div>
  );
};

// Sub-component for the expanded row to handle logic isolation
const MatchInsightsRow: React.FC<{ match: ProcessedMatch, allMatches: ProcessedMatch[] }> = ({ match, allMatches }) => {
    const insights = useMemo(() => generateMatchInsights(match, allMatches), [match, allMatches]);

    return (
        <tr className="bg-slate-800/30 border-b border-slate-700 shadow-inner">
            <td colSpan={7} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Insight 1: Mean & SD */}
                    <div className="bg-primary/50 p-3 rounded-lg border border-slate-700 flex items-start gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-md text-blue-400 mt-1">
                            <Activity size={18} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-textMuted uppercase">Last 15 Combined Games</h4>
                            <div className="mt-1">
                                <p className="text-sm text-white">Avg Total: <span className="font-bold">{insights.mean15.toFixed(1)}</span></p>
                                <p className="text-xs text-textMuted flex items-center gap-1">
                                    Volatility (SD): 
                                    <span className={`${insights.sd15 > 15 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        ±{insights.sd15.toFixed(1)}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Insight 2: High Variance / High Scoring */}
                    <div className="bg-primary/50 p-3 rounded-lg border border-slate-700 flex items-start gap-3">
                        <div className={`p-2 rounded-md mt-1 ${insights.highScoringRate > 20 ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-600/20 text-slate-400'}`}>
                            <AlertTriangle size={18} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-textMuted uppercase">High Variance (+240pts)</h4>
                            <div className="mt-1">
                                <p className="text-sm text-white">Last 10 Rate: <span className="font-bold">{insights.highScoringRate.toFixed(0)}%</span></p>
                                <p className="text-xs text-textMuted">
                                    {insights.highScoringRate > 30 ? 'High probability of shootout.' : 'Standard scoring distribution.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Insight 3: Q4 Trend */}
                    <div className="bg-primary/50 p-3 rounded-lg border border-slate-700 flex items-start gap-3">
                        <div className={`p-2 rounded-md mt-1 ${insights.q4TrendValue > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {insights.q4TrendValue > 0 ? <TrendingUp size={18} /> : <Zap size={18} />}
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-textMuted uppercase">Q4 Intensity Trend</h4>
                            <div className="mt-1">
                                <p className="text-sm text-white">Status: <span className="font-bold">{insights.q4Trend}</span></p>
                                <p className="text-xs text-textMuted">
                                    {insights.q4TrendValue > 0 
                                        ? `Teams score +${insights.q4TrendValue.toFixed(1)} pts over avg in Q4.` 
                                        : `Scoring drops ${Math.abs(insights.q4TrendValue).toFixed(1)} pts in Q4.`}
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </td>
        </tr>
    );
};

export default MatchTable;
