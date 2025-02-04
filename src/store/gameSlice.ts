import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GameState, GameInitOptions, Player, Card, PlayerAction } from '../types';
import { createDeck } from '../utils/poker';
import { AIPlayerService } from '../services/aiPlayer';
import { AppThunk } from './index';

const aiService = new AIPlayerService();

// AI Decision Thunk
export const makeAIDecision = (playerId: string): AppThunk => async (dispatch, getState) => {
  const state = getState().game;
  const player = state.players.find(p => p.id === playerId);
  
  if (!player || !player.isAI) return;
  
  try {
    const decision = await aiService.getDecision(player, state, state.roundHistory);
    
    // Dispatch action based on AI decision
    dispatch(playerAction({
      playerId,
      actionType: decision.actionType,
      amount: decision.amount
    }));
    
    // Find next player
    const currentIndex = state.players.findIndex(p => p.id === playerId);
    const nextIndex = (currentIndex + 1) % state.players.length;
    const nextPlayer = state.players[nextIndex];
    
    // Set next active player
    dispatch(setActivePlayer(nextPlayer.id));
    
  } catch (error) {
    console.error('Error in AI decision:', error);
    // Default to folding on error
    dispatch(playerAction({
      playerId,
      actionType: 'fold'
    }));
  }
};

const initialState: GameState = {
  players: [],
  currentPhase: 'setup',
  activePlayer: null,
  pot: 0,
  deck: [],
  communityCards: [],
  currentBet: 0,
  smallBlind: 1,
  bigBlind: 2,
  dealerPosition: 0,
  smallBlindPosition: 1,
  bigBlindPosition: 2,
  lastAction: null,
  round: 1,
  roundHistory: [] // Add roundHistory to the initial state
};

interface PlayerActionPayload {
  playerId: string;
  actionType: PlayerAction;
  amount?: number;
}

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    initializeGame: (state, action: PayloadAction<GameInitOptions>) => {
      const { playerCount, startingChips, smallBlind, bigBlind } = action.payload;
      const deck = createDeck();
      
      // Create players array with positions
      const players: Player[] = [];
      
      // Add human player at position 0 (bottom middle)
      players.push({
        id: 'human',
        name: 'You',
        chips: startingChips,
        cards: [],
        currentBet: 0,
        isAI: false,
        position: 0 // Human always at bottom middle
      });
      
      // Add AI players in clockwise positions
      for (let i = 0; i < playerCount - 1; i++) {
        players.push({
          id: `ai-${i + 1}`,
          name: `AI Player ${i + 1}`,
          chips: startingChips,
          cards: [],
          currentBet: 0,
          isAI: true,
          personality: aiService.getPersonality(),
          position: i + 1
        });
      }
      
      // Randomly select initial dealer position (excluding human position 0)
      const randomDealerPos = Math.floor(Math.random() * (playerCount - 1)) + 1;
      const smallBlindPos = (randomDealerPos + 1) % playerCount;
      const bigBlindPos = (randomDealerPos + 2) % playerCount;

      // Set initial blind positions
      state.dealerPosition = randomDealerPos;
      state.smallBlindPosition = smallBlindPos;
      state.bigBlindPosition = bigBlindPos;
      
      // Post blinds
      const smallBlindPlayer = players.find(p => p.position === smallBlindPos);
      const bigBlindPlayer = players.find(p => p.position === bigBlindPos);
      
      if (smallBlindPlayer) {
        smallBlindPlayer.chips -= smallBlind;
        smallBlindPlayer.currentBet = smallBlind;
      }
      
      if (bigBlindPlayer) {
        bigBlindPlayer.chips -= bigBlind;
        bigBlindPlayer.currentBet = bigBlind;
      }
      
      state.players = players;
      state.deck = deck;
      state.currentPhase = 'setup';
      state.pot = smallBlind + bigBlind;
      state.communityCards = [];
      state.currentBet = bigBlind;
      state.smallBlind = smallBlind;
      state.bigBlind = bigBlind;
      state.lastAction = null;
      state.round = 1;
      
      // First to act is player after big blind
      state.activePlayer = players[(bigBlindPos + 1) % playerCount].id;
    },
    
    dealCards: (state, action: PayloadAction<{ playerCards: Record<string, Card[]>, deck: Card[] }>) => {
      const { playerCards, deck } = action.payload;
      state.players.forEach(player => {
        player.cards = playerCards[player.id] || [];
      });
      state.deck = deck;
    },
    
    dealCommunityCards: (state, action: PayloadAction<Card[]>) => {
      state.communityCards = action.payload;
    },
    
    setPhase: (state, action: PayloadAction<GameState['currentPhase']>) => {
      state.currentPhase = action.payload;
    },
    
    setActivePlayer: (state, action: PayloadAction<string>) => {
      const playerId = action.payload;
      state.activePlayer = playerId;
      
      // Update round history
      const player = state.players.find(p => p.id === playerId);
      if (player) {
        state.roundHistory.push(`${player.name}'s turn`);
      }
    },
    
    playerAction: (state, action: PayloadAction<PlayerActionPayload>) => {
      const { playerId, actionType, amount } = action.payload;
      const player = state.players.find(p => p.id === playerId);
      if (!player) return;
      
      switch (actionType) {
        case 'fold':
          player.cards = [];
          break;
          
        case 'call':
          const callAmount = state.currentBet - player.currentBet;
          player.chips -= callAmount;
          player.currentBet = state.currentBet;
          state.pot += callAmount;
          break;
          
        case 'raise':
          if (amount) {
            const raiseAmount = amount - player.currentBet;
            player.chips -= raiseAmount;
            player.currentBet = amount;
            state.currentBet = amount;
            state.pot += raiseAmount;
          }
          break;
          
        case 'check':
          // No action needed for check
          break;
      }
      state.lastAction = `${player.name} ${actionType}${amount ? ` to ${amount}` : ''}`;
    },
    
    advanceRound: (state) => {
      // Move dealer button and blinds one position clockwise
      state.dealerPosition = (state.dealerPosition + 1) % state.players.length;
      state.smallBlindPosition = (state.dealerPosition + 1) % state.players.length;
      state.bigBlindPosition = (state.dealerPosition + 2) % state.players.length;
      
      // Reset for new round
      state.communityCards = [];
      state.pot = 0;
      state.currentBet = 0;
      state.lastAction = null;
      state.round += 1;
      
      // Post new blinds
      const smallBlindPlayer = state.players.find(p => p.position === state.smallBlindPosition);
      const bigBlindPlayer = state.players.find(p => p.position === state.bigBlindPosition);
      
      if (smallBlindPlayer) {
        smallBlindPlayer.chips -= state.smallBlind;
        smallBlindPlayer.currentBet = state.smallBlind;
      }
      
      if (bigBlindPlayer) {
        bigBlindPlayer.chips -= state.bigBlind;
        bigBlindPlayer.currentBet = state.bigBlind;
      }
      
      state.pot = state.smallBlind + state.bigBlind;
      state.currentBet = state.bigBlind;
      state.deck = createDeck();
      state.currentPhase = 'setup';
      
      // First to act is player after big blind
      const nextPlayerPos = (state.bigBlindPosition + 1) % state.players.length;
      const nextPlayer = state.players.find(p => p.position === nextPlayerPos);
      if (nextPlayer) {
        state.activePlayer = nextPlayer.id;
      }
    }
  }
});

// Export actions
export const {
  initializeGame,
  playerAction,
  setActivePlayer,
  dealCards,
  dealCommunityCards,
  setPhase,
  advanceRound
} = gameSlice.actions;

export default gameSlice.reducer;
