
import { MatchData, ProcessedMatch, TeamStats, MatchupInsight } from './types';

// Helper to parse numbers from strings safely
const p = (val: string | undefined) => parseInt(val || '0', 10);
const pf = (val: string | undefined) => parseFloat((val || '0').replace('%', ''));

export const calculatePossessions = (stats: any): number => {
  // Formula: 0.96 * (FGA + 0.44 * FTA - ORB + TOV)
  if (!stats) return 0;
  
  const fga = p(stats.field_goals_attempted);
  const fta = p(stats.free_throws_attempted);
  const orb = p(stats.offensive_rebounds);
  const tov = p(stats.turnovers);
  
  return 0.96 * (fga + (0.44 * fta) - orb + tov);
};

export const calculateTS = (points: number, stats: any): number => {
  // Formula: Points / (2 * (FGA + 0.44 * FTA))
  if (!stats || points === 0) return 0;
  const fga = p(stats.field_goals_attempted);
  const fta = p(stats.free_throws_attempted);
  const denominator = 2 * (fga + (0.44 * fta));
  return denominator === 0 ? 0 : (points / denominator) * 100;
}

// Normalize team names from API to match JSON data if needed
export const normalizeTeamName = (name: string): string => {
  // Map standard API names to our internal JSON names if they differ.
  // Currently assuming most are same, but handling potential mismatches.
  const map: {[key: string]: string} = {
    "LA Clippers": "Los Angeles Clippers",
  };
  return map[name] || name;
};

// Mapping for Team Logos using a stable CDN (ESPN or similar based on ID/Slug)
// Using a generic placeholder approach or direct mapping if feasible. 
// Here we use a reliable CDN mapping for NBA teams.
export const getTeamLogo = (teamName: string): string => {
    const normalized = normalizeTeamName(teamName);
    const slug = normalized.toLowerCase().replace(/ /g, '-');
    
    // Mapping specific edge cases if direct slug doesn't work on the CDN
    // Using loadebee CDN or similar public assets
    return `https://loodibee.com/wp-content/uploads/nba-${slug}-logo.png`;
};

export const processMatches = (rawData: MatchData[]): ProcessedMatch[] => {
  return rawData.map(match => {
    const homeScore = p(match.home_score);
    const awayScore = p(match.away_score);
    const totalScore = homeScore + awayScore;
    const line = match.line_odds.total_line;
    
    let result: 'OVER' | 'UNDER' | 'PUSH' = 'PUSH';
    if (totalScore > line) result = 'OVER';
    if (totalScore < line) result = 'UNDER';

    // Check for Overtime
    const isOT = !!match.quarter_scores['OT'];

    // Calculate Regulation Total
    const homeRegScore = ['Q1', 'Q2', 'Q3', 'Q4'].reduce((acc, q) => acc + (match.quarter_scores[q] ? p(match.quarter_scores[q].home_score) : 0), 0);
    const awayRegScore = ['Q1', 'Q2', 'Q3', 'Q4'].reduce((acc, q) => acc + (match.quarter_scores[q] ? p(match.quarter_scores[q].away_score) : 0), 0);
    const regulationTotal = homeRegScore + awayRegScore;

    // Aggregate stats from quarters to get full game approximate stats for advanced metrics
    let homePoss = 0;
    let awayPoss = 0;
    let homeFGA = 0;
    let homeFGM = 0;
    let homeFTA = 0;
    let awayFGA = 0;
    let awayFGM = 0;
    let awayFTA = 0;

    Object.values(match.quarter_stats).forEach(qStats => {
      if (qStats[match.home_team]) {
         const h = qStats[match.home_team];
         homePoss += calculatePossessions(h);
         homeFGA += p(h.field_goals_attempted);
         homeFGM += p(h.field_goals_made);
         homeFTA += p(h.free_throws_attempted);
      }
      if (qStats[match.away_team]) {
         const a = qStats[match.away_team];
         awayPoss += calculatePossessions(a);
         awayFGA += p(a.field_goals_attempted);
         awayFGM += p(a.field_goals_made);
         awayFTA += p(a.free_throws_attempted);
      }
    });

    const pace = (homePoss + awayPoss) / 2; // Very rough estimate for game pace
    
    // Calculate Game TS% & FG%
    const hTS = homeScore / (2 * (homeFGA + 0.44 * homeFTA)) * 100 || 0;
    const aTS = awayScore / (2 * (awayFGA + 0.44 * awayFTA)) * 100 || 0;
    
    const hFG_Pct = homeFGA > 0 ? (homeFGM / homeFGA) * 100 : 0;
    const aFG_Pct = awayFGA > 0 ? (awayFGM / awayFGA) * 100 : 0;

    // Quarterly Totals for chart (combined score)
    const qTotals = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
      if(match.quarter_scores[q]) {
        return p(match.quarter_scores[q].home_score) + p(match.quarter_scores[q].away_score);
      }
      return 0;
    });

    // Individual Quarterly Scores
    const homeQScores = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => match.quarter_scores[q] ? p(match.quarter_scores[q].home_score) : 0);
    const awayQScores = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => match.quarter_scores[q] ? p(match.quarter_scores[q].away_score) : 0);

    return {
      id: match.match_id,
      date: new Date(match.date.split(' ')[0].split('.').reverse().join('-')), // DD.MM.YYYY -> YYYY-MM-DD
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      homeScore,
      awayScore,
      totalScore,
      regulationTotal,
      line,
      overOdds: match.line_odds.over_odds || 1.91,
      underOdds: match.line_odds.under_odds || 1.91,
      result,
      diff: totalScore - line,
      pace,
      homeTS: hTS,
      awayTS: aTS,
      homeFG_Pct: hFG_Pct,
      awayFG_Pct: aFG_Pct,
      quarterlyTotals: qTotals,
      homeQScores,
      awayQScores,
      isOT
    };
  }).sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const aggregateTeamStats = (matches: ProcessedMatch[], rawData: MatchData[] = []): TeamStats[] => {
  const teams: {[key: string]: TeamStats} = {};

  if (rawData.length === 0) return []; // Guard

  rawData.forEach(m => {
    [m.home_team, m.away_team].forEach(teamName => {
        if (!teams[teamName]) {
            teams[teamName] = {
                name: teamName,
                gamesPlayed: 0,
                avgPointsFor: 0,
                avgPointsAgainst: 0,
                avgPace: 0,
                avgTS: 0,
                overRate: 0,
                last10Avg: 0,
                avgFGA: 0,
                avgFG_Pct: 0,
                avg3P_Pct: 0,
                avgFouls: 0,
                avgFTM: 0,
                avgTurnovers: 0,
                avgFTA: 0,
                avgRebounds: 0,
            };
        }
    });

    // Get totals for this specific match for both teams
    let hFGA = 0, hFGM = 0, h3PM = 0, h3PA = 0, hFouls = 0, hFTM = 0, hTOV = 0, hFTA = 0, hREB = 0;
    let aFGA = 0, aFGM = 0, a3PM = 0, a3PA = 0, aFouls = 0, aFTM = 0, aTOV = 0, aFTA = 0, aREB = 0;
    let hPoss = 0, aPoss = 0;
    let hFGA_TS = 0, hFTA_TS = 0, aFGA_TS = 0, aFTA_TS = 0;

    Object.values(m.quarter_stats).forEach(q => {
        if (q[m.home_team]) {
            const s = q[m.home_team];
            hFGA += p(s.field_goals_attempted);
            hFGM += p(s.field_goals_made);
            h3PM += p(s["3_point_field_goals_made"]);
            h3PA += p(s["3_point_field_g_attempted"]);
            hFouls += p(s.personal_fouls);
            hFTM += p(s.free_throws_made);
            hTOV += p(s.turnovers);
            hFTA += p(s.free_throws_attempted);
            hREB += p(s.total_rebounds);
            
            hPoss += calculatePossessions(s);
            hFGA_TS += p(s.field_goals_attempted);
            hFTA_TS += p(s.free_throws_attempted);
        }
        if (q[m.away_team]) {
            const s = q[m.away_team];
            aFGA += p(s.field_goals_attempted);
            aFGM += p(s.field_goals_made);
            a3PM += p(s["3_point_field_goals_made"]);
            a3PA += p(s["3_point_field_g_attempted"]);
            aFouls += p(s.personal_fouls);
            aFTM += p(s.free_throws_made);
            aTOV += p(s.turnovers);
            aFTA += p(s.free_throws_attempted);
            aREB += p(s.total_rebounds);

            aPoss += calculatePossessions(s);
            aFGA_TS += p(s.field_goals_attempted);
            aFTA_TS += p(s.free_throws_attempted);
        }
    });

    const pace = (hPoss + aPoss) / 2;
    const hScore = p(m.home_score);
    const aScore = p(m.away_score);
    const total = hScore + aScore;
    const line = m.line_odds.total_line;
    const isOver = total > line;

    // Update Home Team
    const h = teams[m.home_team];
    h.gamesPlayed++;
    h.avgPointsFor += hScore;
    h.avgPointsAgainst += aScore;
    h.avgPace += pace;
    h.avgTS += (hScore / (2 * (hFGA_TS + 0.44 * hFTA_TS)) * 100) || 0;
    if (isOver) h.overRate++;
    h.avgFGA += hFGA;
    h.avgFG_Pct += (hFGA > 0 ? (hFGM/hFGA) * 100 : 0);
    h.avg3P_Pct += (h3PA > 0 ? (h3PM / h3PA) * 100 : 0);
    h.avgFouls += hFouls;
    h.avgFTM += hFTM;
    h.avgTurnovers += hTOV;
    h.avgFTA += hFTA;
    h.avgRebounds += hREB;

    // Update Away Team
    const a = teams[m.away_team];
    a.gamesPlayed++;
    a.avgPointsFor += aScore;
    a.avgPointsAgainst += hScore;
    a.avgPace += pace;
    a.avgTS += (aScore / (2 * (aFGA_TS + 0.44 * aFTA_TS)) * 100) || 0;
    if (isOver) a.overRate++;
    a.avgFGA += aFGA;
    a.avgFG_Pct += (aFGA > 0 ? (aFGM/aFGA) * 100 : 0);
    a.avg3P_Pct += (a3PA > 0 ? (a3PM / a3PA) * 100 : 0);
    a.avgFouls += aFouls;
    a.avgFTM += aFTM;
    a.avgTurnovers += aTOV;
    a.avgFTA += aFTA;
    a.avgRebounds += aREB;

  });

  return Object.values(teams).map(t => ({
    ...t,
    avgPointsFor: t.avgPointsFor / t.gamesPlayed,
    avgPointsAgainst: t.avgPointsAgainst / t.gamesPlayed,
    avgPace: t.avgPace / t.gamesPlayed,
    avgTS: t.avgTS / t.gamesPlayed,
    overRate: (t.overRate / t.gamesPlayed) * 100,
    avgFGA: t.avgFGA / t.gamesPlayed,
    avgFG_Pct: t.avgFG_Pct / t.gamesPlayed,
    avg3P_Pct: t.avg3P_Pct / t.gamesPlayed,
    avgFouls: t.avgFouls / t.gamesPlayed,
    avgFTM: t.avgFTM / t.gamesPlayed,
    avgTurnovers: t.avgTurnovers / t.gamesPlayed,
    avgFTA: t.avgFTA / t.gamesPlayed,
    avgRebounds: t.avgRebounds / t.gamesPlayed
  }));
};

// Automatic Matchup Analysis
export const analyzeMatchup = (t1: TeamStats, t2: TeamStats): MatchupInsight[] => {
  const insights: MatchupInsight[] = [];

  // 1. Pace Clash (High Volume)
  // Typical NBA Pace is ~100. Combined FGA > 175 implies high pace.
  const combinedFGA = t1.avgFGA + t2.avgFGA;
  if (combinedFGA > 175) {
      insights.push({
          type: 'PACE',
          title: 'Pace Clash: High Volume',
          desc: `Combined Avg FGA is ${combinedFGA.toFixed(1)}. Both teams play fast, increasing potential for Over.`,
          color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      });
  }

  // 2. Brick City (Low 3P%)
  if (t1.avg3P_Pct < 33 && t2.avg3P_Pct < 33) {
      insights.push({
          type: 'BRICK',
          title: 'Brick City Warning',
          desc: `Both teams shoot < 33% from deep (${t1.avg3P_Pct.toFixed(1)}% & ${t2.avg3P_Pct.toFixed(1)}%). Risk of scoring droughts.`,
          color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
      });
  }

  // 3. Foul Trouble Impact (Clock Stoppage)
  const combinedFouls = t1.avgFouls + t2.avgFouls;
  const combinedFTM = t1.avgFTM + t2.avgFTM;
  if (combinedFouls > 40 && combinedFTM > 35) {
       insights.push({
          type: 'FOUL',
          title: 'Whistle Heavy',
          desc: `High combined fouls (${combinedFouls.toFixed(0)}) & FTM (${combinedFTM.toFixed(0)}). Frequent stops & free points favor Over.`,
          color: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      });
  }

  // 4. Hot Offense vs Bad Defense
  // Check T1 Offense vs T2 Defense
  if (t1.avgPointsFor > 115 && t2.avgPointsAgainst > 115) {
      insights.push({
          type: 'MISMATCH',
          title: `${t1.name} Scoring Potential`,
          desc: `Elite Offense vs Poor Defense. ${t1.name} scores ${t1.avgPointsFor.toFixed(1)} while ${t2.name} allows ${t2.avgPointsAgainst.toFixed(1)}.`,
          color: 'bg-red-500/20 text-red-400 border-red-500/30'
      });
  }
  // Check T2 Offense vs T1 Defense
  if (t2.avgPointsFor > 115 && t1.avgPointsAgainst > 115) {
      insights.push({
          type: 'MISMATCH',
          title: `${t2.name} Scoring Potential`,
          desc: `Elite Offense vs Poor Defense. ${t2.name} scores ${t2.avgPointsFor.toFixed(1)} while ${t1.name} allows ${t1.avgPointsAgainst.toFixed(1)}.`,
          color: 'bg-red-500/20 text-red-400 border-red-500/30'
      });
  }

  // 5. Defensive Grinder
  if (t1.avgPointsAgainst < 108 && t2.avgPointsAgainst < 108) {
      insights.push({
          type: 'DEFENSE',
          title: 'Defensive Battle',
          desc: `Both teams allow < 108 PPG. Expect tight contesting and lower total.`,
          color: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
      });
  }

  return insights;
};

// Market Insights Calculation
export const calculateMarketInsights = (matches: ProcessedMatch[]) => {
    const stats: Record<string, { totalDiff: number, games: number, overs: number }> = {};

    matches.forEach(m => {
      [m.homeTeam, m.awayTeam].forEach(team => {
        if (!stats[team]) stats[team] = { totalDiff: 0, games: 0, overs: 0 };
        stats[team].totalDiff += Math.abs(m.diff); // Absolute difference shows volatility vs line
        stats[team].games++;
        if (m.result === 'OVER') stats[team].overs++;
      });
    });

    const results = Object.entries(stats).map(([name, data]) => ({
      name,
      avgDiff: data.totalDiff / data.games,
      overPct: (data.overs / data.games) * 100
    }));

    // Sorts
    // Nightmares: Most unpredictable (highest avg difference from line)
    const nightmares = [...results].sort((a, b) => b.avgDiff - a.avgDiff)[0];
    // Sharps: Most predictable (lowest avg difference from line)
    const sharps = [...results].sort((a, b) => a.avgDiff - b.avgDiff)[0];
    // Over Kings: Highest Over %
    const overKings = [...results].sort((a, b) => b.overPct - a.overPct)[0];
    // Under Dogs: Lowest Over % (Highest Under %)
    const underKings = [...results].sort((a, b) => a.overPct - b.overPct)[0];

    return { nightmares, sharps, overKings, underKings };
};

// Statistical Helpers
const getMean = (data: number[]) => data.reduce((a, b) => a + b, 0) / data.length;

const getSD = (data: number[]) => {
  const m = getMean(data);
  return Math.sqrt(data.reduce((sq, n) => sq + Math.pow(n - m, 2), 0) / (data.length - 1));
};

export const generateMatchInsights = (match: ProcessedMatch, allMatches: ProcessedMatch[]) => {
  // Filter matches involving either the home or away team, strictly BEFORE this match date
  const relevantHistory = allMatches.filter(m => 
    (m.date.getTime() < match.date.getTime()) && 
    (m.homeTeam === match.homeTeam || m.awayTeam === match.homeTeam || m.homeTeam === match.awayTeam || m.awayTeam === match.awayTeam)
  ).sort((a, b) => b.date.getTime() - a.date.getTime());

  // 1. Mean and SD of totals (Last 15 games combined)
  const last15 = relevantHistory.slice(0, 15);
  const totals15 = last15.map(m => m.totalScore);
  
  let mean15 = 0;
  let sd15 = 0;
  
  if (totals15.length > 0) {
    mean15 = getMean(totals15);
    sd15 = getSD(totals15);
  }

  // 2. % of games > 240 points (Last 10 games)
  const last10 = relevantHistory.slice(0, 10);
  const highScoringGames = last10.filter(m => m.totalScore > 240).length;
  const highScoringRate = last10.length > 0 ? (highScoringGames / last10.length) * 100 : 0;

  // 3. Q4 Scoring Trends
  let q4DiffAcc = 0;
  let gamesCounted = 0;

  last10.forEach(m => {
     if (m.quarterlyTotals.length === 4) {
        const q123Avg = (m.quarterlyTotals[0] + m.quarterlyTotals[1] + m.quarterlyTotals[2]) / 3;
        const q4 = m.quarterlyTotals[3];
        q4DiffAcc += (q4 - q123Avg);
        gamesCounted++;
     }
  });
  
  const q4TrendValue = gamesCounted > 0 ? q4DiffAcc / gamesCounted : 0;
  let q4Trend = "Neutral";
  if (q4TrendValue > 2) q4Trend = "High Intensity (+)"; // Scores go UP in Q4
  if (q4TrendValue < -2) q4Trend = "Fade (-)"; // Scores go DOWN in Q4

  return {
    mean15,
    sd15,
    highScoringRate,
    q4Trend,
    q4TrendValue
  };
};

export const exportLiveGamesToCSV = (liveGames: any[], teams: TeamStats[]) => {
    if (!liveGames || liveGames.length === 0) return;

    const headers = ["Date", "Home Team", "Away Team", "Vegas Line", "Home Avg PPG", "Away Avg PPG", "Model Projection", "Edge"];
    const rows = liveGames.map(game => {
        const homeStats = teams.find(t => t.name === normalizeTeamName(game.home_team));
        const awayStats = teams.find(t => t.name === normalizeTeamName(game.away_team));
        
        let projection = 0;
        if (homeStats && awayStats) {
            projection = (homeStats.avgPointsFor + homeStats.avgPointsAgainst + awayStats.avgPointsFor + awayStats.avgPointsAgainst) / 2;
        }

        const market = game.bookmakers[0]?.markets.find((m: any) => m.key === 'totals');
        const line = market?.outcomes[0]?.point || 0;
        const edge = line > 0 && projection > 0 ? projection - line : 0;

        return [
            new Date(game.commence_time).toLocaleDateString(),
            game.home_team,
            game.away_team,
            line,
            homeStats ? homeStats.avgPointsFor.toFixed(1) : '-',
            awayStats ? awayStats.avgPointsFor.toFixed(1) : '-',
            projection.toFixed(1),
            edge.toFixed(1)
        ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nba_odds_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
