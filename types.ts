
export interface QuarterStats {
  field_goals_attempted: string;
  field_goals_made: string;
  "field_goals_": string;
  "2_point_field_g_attempted": string;
  "2_point_field_goals_made": string;
  "2_point_field_goals_": string;
  "3_point_field_g_attempted": string;
  "3_point_field_goals_made": string;
  "3_point_field_goals_": string;
  free_throws_attempted: string;
  free_throws_made: string;
  "free_throws_": string;
  offensive_rebounds: string;
  defensive_rebounds: string;
  total_rebounds: string;
  assists: string;
  blocks?: string;
  turnovers?: string;
  steals?: string;
  personal_fouls?: string;
}

export interface TeamQuarterStats {
  [teamName: string]: QuarterStats;
}

export interface MatchData {
  match_id: string;
  stage: string;
  date: string;
  scraped_at: string;
  home_team: string;
  away_team: string;
  home_score: string;
  away_score: string;
  quarter_scores: {
    [key: string]: {
      home_score: string;
      away_score: string;
    };
  };
  match_stats: any;
  quarter_stats: {
    [key: string]: TeamQuarterStats;
  };
  line_odds: {
    total_line: number;
    over_odds: number;
    under_odds: number;
  };
}

export interface ProcessedMatch {
  id: string;
  date: Date;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalScore: number;
  regulationTotal: number; // Score at end of Q4
  line: number;
  overOdds: number;
  underOdds: number;
  result: 'OVER' | 'UNDER' | 'PUSH';
  diff: number;
  pace: number; // Estimated possessions
  homeTS: number; // True Shooting %
  awayTS: number;
  homeFG_Pct: number;
  awayFG_Pct: number;
  quarterlyTotals: number[];
  homeQScores: number[];
  awayQScores: number[];
  isOT: boolean;
}

export interface TeamStats {
  name: string;
  gamesPlayed: number;
  avgPointsFor: number;
  avgPointsAgainst: number;
  avgPace: number;
  avgTS: number;
  overRate: number;
  last10Avg: number;
  // Granular stats for Insights
  avgFGA: number;
  avgFG_Pct: number;
  avg3P_Pct: number;
  avgFouls: number;
  avgFTM: number;
  // Advanced Stats Data
  avgTurnovers: number;
  avgFTA: number;
  avgRebounds: number;
}

export interface MatchupInsight {
  type: 'PACE' | 'BRICK' | 'FOUL' | 'MISMATCH' | 'DEFENSE';
  title: string;
  desc: string;
  color: string;
}

// Live Odds API Interfaces
export interface Outcome {
  name: string;
  price: number;
  point?: number;
}

export interface Market {
  key: string;
  last_update: string;
  outcomes: Outcome[];
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
}

export interface LiveGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

export interface LineMovement {
    gameId: string;
    oldLine: number;
    newLine: number;
    timestamp: number;
    direction: 'UP' | 'DOWN';
}
