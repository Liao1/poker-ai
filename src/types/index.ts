// Player-related types
export type PlayerAction = 'fold' | 'check' | 'call' | 'raise';
export type PlayerPersonality = 'aggressive' | 'conservative' | 'balanced' | 'unpredictable' | 'mathematical';

export interface Card {
  suit: '♠' | '♣' | '♥' | '♦';
  rank: string;
  value: number;
  roundHistory: string[]; // Add roundHistory to track actions in each round
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  cards: Card[];
  currentBet: number;
  isAI: boolean;
  personality?: PlayerPersonality;
  position: number; // Position at the table (0 to n-1)
}

// Game state types
export type GamePhase = 'setup' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface GameState {
  players: Player[];
  currentPhase: GamePhase;
  activePlayer: string | null;
  pot: number;
  deck: Card[];
  communityCards: Card[];
  currentBet: number;
  smallBlind: number;
  bigBlind: number;
  dealerPosition: number; // Position of the dealer button
  smallBlindPosition: number; // Position of small blind
  bigBlindPosition: number; // Position of big blind
  lastAction: string | null;
  round: number; // Current round number
  roundHistory: string[]; // Add roundHistory to GameState
}

export interface GameInitOptions {
  playerCount: number;
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
}

// Hand evaluation types
export interface HandRank {
  rank: string;
  value: number;
  cards: Card[];
}

// Action validation types
export interface ActionValidation {
  isValid: boolean;
  error?: string;
}

// AI decision types
export interface AIDecision {
  actionType: PlayerAction;
  amount?: number;
}

// Game analysis types
export interface GameAnalysis {
  overview: string;
  keyDecisions: Array<{
    action: string;
    analysis: string;
  }>;
  improvements: string[];
  rating: number;
}
