
import React, { createContext, useContext, useState, useEffect } from 'react';
import { processMatches, aggregateTeamStats } from './utils';
import { ProcessedMatch, TeamStats, MatchData, LiveGame, LineMovement } from './types';

interface DataContextType {
  matches: ProcessedMatch[]; // Currently active matches (default 2025)
  teams: TeamStats[];       // Currently active teams (default 2025)
  liveGames: LiveGame[];
  lineMovements: Record<string, LineMovement>;
  loading: boolean;
  refreshLiveOdds: () => Promise<void>;
  simulateLineMove: () => void;
  getSeasonData: (seasonId: string) => Promise<ProcessedMatch[]>; // New method
  lastUpdated: Date | null;
  availableSeasons: { id: string, name: string }[]; // Metadata
}

const DataContext = createContext<DataContextType>({
  matches: [],
  teams: [],
  liveGames: [],
  lineMovements: {},
  loading: true,
  refreshLiveOdds: async () => {},
  simulateLineMove: () => {},
  getSeasonData: async () => [],
  lastUpdated: null,
  availableSeasons: [],
});

const CACHE_KEY = 'nba_live_odds_cache';
const MOVEMENTS_CACHE_KEY = 'nba_line_movements_cache';
const API_KEY = '79333146a8a297d7a113c1b19345c398'; 

const AVAILABLE_SEASONS = [
    { id: '2025', name: '2024-2025 Season (Current)', path: './datasets/nba_2025.json' },
    { id: '2024', name: '2023-2024 Season', path: './datasets/nba_2024.json' },
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{ matches: ProcessedMatch[]; teams: TeamStats[]; liveGames: LiveGame[]; lineMovements: Record<string, LineMovement>; loading: boolean }>({
    matches: [],
    teams: [],
    liveGames: [],
    lineMovements: {},
    loading: true,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const getLineFromGame = (game: LiveGame): number | null => {
      const market = game.bookmakers?.[0]?.markets?.find(m => m.key === 'totals');
      return market?.outcomes?.[0]?.point || null;
  };

  const fetchLiveOdds = async (forceRefresh = false) => {
    let currentGames = state.liveGames;

    if (!forceRefresh) {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedMovements = localStorage.getItem(MOVEMENTS_CACHE_KEY);
      
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          const movements = cachedMovements ? JSON.parse(cachedMovements) : {};
          
          setState(prev => ({ ...prev, liveGames: data, lineMovements: movements }));
          setLastUpdated(new Date(timestamp));
          console.log("Loaded live odds from cache.");
          return;
        } catch (e) {
          console.warn("Error parsing cached odds", e);
          localStorage.removeItem(CACHE_KEY);
        }
      }
    }

    try {
      console.log("Fetching live odds from API...");
      const liveResponse = await fetch(`https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?bookmakers=betfair,pinnacle,unibet_eu,onexbet&markets=h2h,spreads,totals&apiKey=${API_KEY}`);
      
      if (liveResponse.ok) {
        const newGames = await liveResponse.json() as LiveGame[];
        const now = new Date();
        
        const newMovements = { ...state.lineMovements };
        let hasMovements = false;

        const oldGamesMap = new Map(state.liveGames.map(g => [g.id, g]));

        newGames.forEach(newGame => {
            const oldGame = oldGamesMap.get(newGame.id);
            if (oldGame) {
                const newLine = getLineFromGame(newGame);
                const oldLine = getLineFromGame(oldGame);

                if (newLine !== null && oldLine !== null && newLine !== oldLine) {
                    newMovements[newGame.id] = {
                        gameId: newGame.id,
                        oldLine: oldLine,
                        newLine: newLine,
                        timestamp: now.getTime(),
                        direction: newLine > oldLine ? 'UP' : 'DOWN'
                    };
                    hasMovements = true;
                }
            }
        });
        
        setState(prev => ({ 
            ...prev, 
            liveGames: newGames,
            lineMovements: newMovements
        }));
        setLastUpdated(now);
        
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: newGames,
          timestamp: now.getTime()
        }));
        
        localStorage.setItem(MOVEMENTS_CACHE_KEY, JSON.stringify(newMovements));

        if (hasMovements) console.log("Line movements detected.");

      } else {
        console.warn("Live odds API quota limit or error", liveResponse.statusText);
      }
    } catch (apiErr) {
      console.warn("Failed to fetch live odds", apiErr);
    }
  };

  const refreshLiveOdds = async () => {
    await fetchLiveOdds(true);
  };

  const simulateLineMove = () => {
      if (state.liveGames.length === 0) return;
      const targetGame = state.liveGames[0];
      const currentLine = getLineFromGame(targetGame) || 220;
      const simulatedOldLine = currentLine - 1.5;

      const fakeMovement: LineMovement = {
          gameId: targetGame.id,
          oldLine: simulatedOldLine,
          newLine: currentLine,
          timestamp: new Date().getTime(),
          direction: 'UP'
      };

      setState(prev => ({
          ...prev,
          lineMovements: { ...prev.lineMovements, [targetGame.id]: fakeMovement }
      }));
  };

  // Method to load specific season data
  const getSeasonData = async (seasonId: string): Promise<ProcessedMatch[]> => {
      const seasonConfig = AVAILABLE_SEASONS.find(s => s.id === seasonId);
      if (!seasonConfig) return [];

      try {
          const response = await fetch(seasonConfig.path);
          if (!response.ok) throw new Error("Failed to fetch season data");
          const rawData = await response.json() as MatchData[];
          return processMatches(rawData);
      } catch (error) {
          console.error(`Error loading season ${seasonId}:`, error);
          return [];
      }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load Default Historical Data (2025 Season)
        const defaultSeason = AVAILABLE_SEASONS[0]; 
        const response = await fetch(defaultSeason.path);
        if (!response.ok) {
          throw new Error(`Failed to fetch historical data: ${response.statusText}`);
        }
        const rawData = await response.json() as MatchData[];
        const processedMatches = processMatches(rawData);
        const teamStats = aggregateTeamStats(processedMatches, rawData);

        setState(prev => ({ ...prev, matches: processedMatches, teams: teamStats }));

        await fetchLiveOdds(false);

      } catch (error) {
        console.error("Error loading NBA data:", error);
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    loadData();
  }, []);

  return (
    <DataContext.Provider value={{ 
        ...state, 
        refreshLiveOdds, 
        simulateLineMove, 
        getSeasonData, 
        lastUpdated, 
        availableSeasons: AVAILABLE_SEASONS.map(s => ({ id: s.id, name: s.name })) 
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
