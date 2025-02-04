// Player-related types
export type PlayerAction = 'fold' | 'check' | 'call' | 'raise';
export type PlayerPersonality = 'aggressive' | 'conservative' | 'balanced' | 'unpredictable' | 'mathematical';

export interface Card {
  suit: '♠' | '♣' | '♥' | '♦';
  rank: string;
  value: number;
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
  hasActed?: boolean; // Track if player has acted in current betting round
  lastAction?: PlayerAction; // Track player's last action
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
  roundHistory: string[]; // Track round history
  // New fields for proper betting rules
  lastRaisePlayerId: string | null; // Track who made the last raise
  bettingRoundComplete: boolean; // Track if current betting round is complete
  lastRaise: number; // Amount of the last raise
  activePlayersInRound: string[]; // Players who haven't folded
  lastToAct: string | null; // Player who needs to act last in current round
  potsByPlayer: Record<string, number>; // Track side pots
  minRaise: number; // Minimum raise amount
  maxRaise: number | null; // Maximum raise amount (null for no-limit)
  betsSinceLastRaise: number; // Count of bets since last raise
  aiDecisionInProgress: boolean; // Track if an AI decision is currently being processed
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
  kickers: Card[]; // Added kickers for tie-breaking
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

// Betting related types
export interface BettingRound {
  phase: GamePhase;
  currentBet: number;
  lastRaise: number;
  actionsRemaining: number; // Number of players still to act
  isComplete: boolean;
}

export interface PotInfo {
  amount: number;
  eligiblePlayers: string[]; // Player IDs eligible to win this pot
}
