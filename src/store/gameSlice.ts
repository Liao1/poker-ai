import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GameState, GameInitOptions, Player, Card, PlayerAction, GamePhase, HandRank } from '../types';
import { createDeck, evaluateHand, compareHands } from '../utils/poker';
import { AIPlayerService } from '../services/aiPlayer';
import { AppThunk } from './index';

const aiService = new AIPlayerService();

// AI Decision Thunk
export const makeAIDecision = (playerId: string): AppThunk => async (dispatch, getState) => {
  const state = getState().game;
  const player = state.players.find(p => p.id === playerId);
  
  // Only proceed if:
  // 1. It's an AI player
  // 2. The betting round is not complete
  // 3. It's actually this player's turn
  // 4. No other AI decision is in progress
  if (!player || 
      !player.isAI || 
      state.bettingRoundComplete || 
      state.activePlayer !== playerId ||
      state.aiDecisionInProgress) return;
  
  try {
    // Set flag before starting decision
    dispatch(setAIDecisionInProgress(true));
    
    const decision = await aiService.getDecision(player, state, state.roundHistory);
    
    // Dispatch action based on AI decision
    dispatch(playerAction({
      playerId,
      actionType: decision.actionType,
      amount: decision.amount
    }));
    
    // Get updated state after action
    const updatedState = getState().game;
    
    // Only proceed to next player if betting round isn't complete
    if (!updatedState.bettingRoundComplete) {
      dispatch(handleTurnTransition());
    }
  } catch (error) {
    console.error('Error in AI decision:', error);
    // Default to folding on error
    dispatch(playerAction({
      playerId,
      actionType: 'fold'
    }));
  } finally {
    // Always clear the flag when done
    dispatch(setAIDecisionInProgress(false));
  }
};

// Handle turn transition as a separate action
export const handleTurnTransition = (): AppThunk => (dispatch, getState) => {
  const state = getState().game;
  if (!state.bettingRoundComplete) {
    const currentIndex = state.players.findIndex(p => p.id === state.activePlayer);
    let nextIndex = (currentIndex + 1) % state.players.length;
    
    // Find next eligible player
    while (!state.activePlayersInRound.includes(state.players[nextIndex].id)) {
      nextIndex = (nextIndex + 1) % state.players.length;
    }
    
    const nextPlayer = state.players[nextIndex];
    dispatch(setActivePlayer(nextPlayer.id));
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
  roundHistory: [],
  lastRaisePlayerId: null,
  bettingRoundComplete: false,
  lastRaise: 0,
  activePlayersInRound: [],
  lastToAct: null,
  potsByPlayer: {},
  minRaise: 2,
  maxRaise: null,
  betsSinceLastRaise: 0,
  aiDecisionInProgress: false
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
    setAIDecisionInProgress: (state, action: PayloadAction<boolean>) => {
      state.aiDecisionInProgress = action.payload;
    },
    
    initializeGame: (state, action: PayloadAction<GameInitOptions>) => {
      const { playerCount, startingChips, smallBlind, bigBlind } = action.payload;
      const deck = createDeck();
      
      // Create players array with positions
      const players: Player[] = [];
      
      // Initialize side pots
      const potsByPlayer: Record<string, number> = {};
      
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
      
      // Initialize betting round state
      const activePlayersInRound = players.map(p => p.id);
      
      // Set initial game state
      state.players = players;
      state.deck = deck;
      state.currentPhase = 'preflop';
      state.pot = smallBlind + bigBlind;
      state.communityCards = [];
      state.currentBet = bigBlind;
      state.smallBlind = smallBlind;
      state.bigBlind = bigBlind;
      state.lastAction = null;
      state.round = 1;
      state.lastRaisePlayerId = null;
      state.bettingRoundComplete = false;
      state.lastRaise = bigBlind;
      state.activePlayersInRound = activePlayersInRound;
      state.lastToAct = players[bigBlindPos].id;
      state.potsByPlayer = potsByPlayer;
      state.minRaise = bigBlind * 2;
      state.betsSinceLastRaise = 0;
      state.aiDecisionInProgress = false;
      
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

      // Handle reset action
      if (playerId === 'reset') {
        state.currentBet = 0;
        state.lastRaisePlayerId = null;
        state.bettingRoundComplete = false;
        state.lastRaise = 0;
        state.betsSinceLastRaise = 0;
        state.players.forEach(p => {
          p.currentBet = 0;
          p.hasActed = false;
          p.lastAction = undefined;
        });
        return;
      }

      // Don't process actions if betting round is complete
      if (state.bettingRoundComplete) {
        return;
      }

      const player = state.players.find(p => p.id === playerId);
      if (!player) return;

      player.hasActed = true;
      player.lastAction = actionType;
      
      switch (actionType) {
        case 'fold':
          player.cards = [];
          state.activePlayersInRound = state.activePlayersInRound.filter(id => id !== playerId);
          // Check if only one player remains
          if (state.activePlayersInRound.length === 1) {
            state.bettingRoundComplete = true;
            state.currentPhase = 'showdown';
          }
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
            state.lastRaise = amount - state.currentBet;
            state.minRaise = state.lastRaise * 2;
            state.lastRaisePlayerId = playerId;
            state.betsSinceLastRaise = 0;
            state.bettingRoundComplete = false;
            
            // Reset other players' hasActed flag since they need to respond to raise
            state.players.forEach(p => {
              if (p.id !== playerId && state.activePlayersInRound.includes(p.id)) {
                p.hasActed = false;
                p.lastAction = undefined;
              }
            });

            // Set last to act
            const lastPlayerIndex = (state.players.findIndex(p => p.id === playerId) - 1 + state.players.length) % state.players.length;
            state.lastToAct = state.players[lastPlayerIndex].id;
          }
          break;
          
        case 'check':
          // No action needed for check
          break;
      }
      state.lastAction = `${player.name} ${actionType}${amount ? ` to ${amount}` : ''}`;
      
      // Check if betting round is complete
      const activePlayers = state.players.filter(p => state.activePlayersInRound.includes(p.id));
      const allPlayersActed = activePlayers.every(p => p.hasActed);
      const allBetsMatched = activePlayers.every(p => p.currentBet === state.currentBet);
      const isLastToAct = playerId === state.lastToAct;
      
      if ((allPlayersActed && allBetsMatched) || isLastToAct) {
        state.bettingRoundComplete = true;
        
        // Handle phase transition and card dealing
        switch (state.currentPhase) {
          case 'preflop':
            state.currentPhase = 'flop';
            // Deal 3 flop cards from deck
            state.communityCards = state.deck.slice(0, 3);
            state.deck = state.deck.slice(3);
            break;
          case 'flop':
            state.currentPhase = 'turn';
            // Deal turn card
            state.communityCards.push(state.deck[0]);
            state.deck = state.deck.slice(1);
            break;
          case 'turn':
            state.currentPhase = 'river';
            // Deal river card
            state.communityCards.push(state.deck[0]);
            state.deck = state.deck.slice(1);
            break;
          case 'river':
            state.currentPhase = 'showdown';
            
            // If only one player remains, they win the pot
            if (state.activePlayersInRound.length === 1) {
              const winner = state.players.find(p => p.id === state.activePlayersInRound[0]);
              if (winner) {
                winner.chips += state.pot;
                state.roundHistory.push(`${winner.name} wins pot of ${state.pot}`);
              }
              break;
            }
            
            // Show all active players' hole cards and evaluate hands
            const playerHands = state.activePlayersInRound
              .map(playerId => {
                const player = state.players.find(p => p.id === playerId);
                if (!player) return null;
                
                // Evaluate player's hand
                const handRank = evaluateHand(player.cards, state.communityCards);
                return { player, handRank };
              })
              .filter((hand): hand is { player: Player; handRank: HandRank } => hand !== null);

            // Find the winner(s)
            let winners = [playerHands[0]];
            for (let i = 1; i < playerHands.length; i++) {
              const comparison = compareHands(playerHands[i].handRank, winners[0].handRank);
              if (comparison > 0) {
                // Current hand is better
                winners = [playerHands[i]];
              } else if (comparison === 0) {
                // Current hand ties with best hand
                winners.push(playerHands[i]);
              }
            }

            // Split pot among winners
            const winShare = Math.floor(state.pot / winners.length);
            winners.forEach(({ player, handRank }) => {
              player.chips += winShare;
              state.roundHistory.push(
                `${player.name} wins ${winShare} with ${handRank.rank}`
              );
            });
            break;
        }

        // Reset betting state for next round if not showdown
        if (state.currentPhase !== 'showdown') {
          // Reset betting round state
          state.currentBet = 0;
          state.lastRaisePlayerId = null;
          state.lastRaise = 0;
          state.betsSinceLastRaise = 0;
          state.bettingRoundComplete = false;
          state.players.forEach(p => {
            p.currentBet = 0;
            p.hasActed = false;
            p.lastAction = undefined;
          });
          
          // In preflop, first to act is after big blind. In other betting rounds, first to act is after dealer
          const startPos = state.currentPhase === ('preflop' as GamePhase) ? 
            state.bigBlindPosition : 
            state.dealerPosition;
          let nextPlayerPos = (startPos + 1) % state.players.length;
          let nextPlayer = state.players.find(p => p.position === nextPlayerPos && state.activePlayersInRound.includes(p.id));
          
          // If no eligible player found after initial position, keep searching
          while (!nextPlayer && nextPlayerPos !== startPos) {
            nextPlayerPos = (nextPlayerPos + 1) % state.players.length;
            nextPlayer = state.players.find(p => p.position === nextPlayerPos && state.activePlayersInRound.includes(p.id));
          }
          
          if (nextPlayer) {
            state.activePlayer = nextPlayer.id;
          }
        }
      }
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
      state.aiDecisionInProgress = false;
      
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
      state.currentPhase = 'preflop';
      
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
  advanceRound,
  setAIDecisionInProgress
} = gameSlice.actions;

export default gameSlice.reducer;
