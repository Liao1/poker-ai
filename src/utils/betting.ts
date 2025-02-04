import { GameState, Player, PlayerAction, ActionValidation } from '../types';

export const validateAction = (
  actionType: PlayerAction,
  amount: number | undefined,
  player: Player,
  gameState: GameState
): ActionValidation => {
  // Cannot act if player has no chips (except for fold)
  if (player.chips <= 0 && actionType !== 'fold') {
    return {
      isValid: false,
      error: 'Player has no chips remaining'
    };
  }

  // Cannot act if betting round is complete (except for showdown)
  if (gameState.bettingRoundComplete && gameState.currentPhase !== 'showdown') {
    return {
      isValid: false,
      error: 'Betting round is complete'
    };
  }

  // Cannot act if not active player
  if (gameState.activePlayer !== player.id) {
    return {
      isValid: false,
      error: 'Not your turn'
    };
  }

  switch (actionType) {
    case 'fold':
      // Can always fold
      return {
        isValid: true,
        error: undefined
      };

    case 'check':
      // Can only check if there's no betting or player has matched current bet
      if (gameState.currentBet > player.currentBet) {
        return {
          isValid: false,
          error: 'Cannot check when there is an active bet - must call or raise'
        };
      }
      return {
        isValid: true,
        error: undefined
      };

    case 'call':
      // Can't call if there's nothing to call
      if (gameState.currentBet === player.currentBet) {
        return {
          isValid: false,
          error: 'No bet to call'
        };
      }
      // Can't call if not enough chips
      const callAmount = gameState.currentBet - player.currentBet;
      if (callAmount > player.chips) {
        return {
          isValid: false,
          error: 'Not enough chips to call'
        };
      }
      return { isValid: true };

    case 'raise':
      // No raise after betting round complete
      if (gameState.bettingRoundComplete) {
        return {
          isValid: false,
          error: 'Cannot raise - betting round is complete'
        };
      }

      if (!amount) {
        return {
          isValid: false,
          error: 'Must specify raise amount'
        };
      }

      // Calculate required raise amounts
      const minRaise = Math.max(
        gameState.currentBet * 2,
        gameState.currentBet + gameState.minRaise
      );
      
      // All-in is always allowed
      if (amount === player.chips + player.currentBet) {
        return {
          isValid: true,
          error: undefined
        };
      }

      // Check minimum raise
      if (amount < minRaise) {
        return {
          isValid: false,
          error: `Raise must be at least ${minRaise} chips`
        };
      }

      // Check if player has enough chips
      const raiseAmount = amount - player.currentBet;
      if (raiseAmount > player.chips) {
        return {
          isValid: false,
          error: 'Not enough chips to raise'
        };
      }

      return {
        isValid: true,
        error: undefined
      };

    default:
      return {
        isValid: false,
        error: 'Invalid action'
      };
  }
};

export const calculatePotOdds = (
  player: Player,
  gameState: GameState
): number => {
  const toCall = gameState.currentBet - player.currentBet;
  const effectivePot = gameState.pot + toCall;
  return (toCall / effectivePot) * 100;
};

export const calculateImpliedOdds = (
  player: Player,
  gameState: GameState
): number => {
  const totalChips = gameState.players.reduce((sum, p) => sum + p.chips, 0);
  const potentialPot = totalChips + gameState.pot;
  const toCall = gameState.currentBet - player.currentBet;
  return (toCall / potentialPot) * 100;
};

export const getBettingRound = (gameState: GameState): number => {
  switch (gameState.currentPhase) {
    case 'preflop':
      return 1;
    case 'flop':
      return 2;
    case 'turn':
      return 3;
    case 'river':
      return 4;
    default:
      return 0;
  }
};

export const getPositionStrength = (
  playerIndex: number,
  totalPlayers: number
): number => {
  // Later positions are stronger (higher value)
  return playerIndex / totalPlayers;
};

export const shouldPostBlind = (
  playerIndex: number,
  totalPlayers: number,
  dealer: number
): 'small' | 'big' | null => {
  const smallBlindPos = (dealer + 1) % totalPlayers;
  const bigBlindPos = (dealer + 2) % totalPlayers;

  if (playerIndex === smallBlindPos) return 'small';
  if (playerIndex === bigBlindPos) return 'big';
  return null;
};

export const calculateMinRaise = (gameState: GameState): number => {
  return Math.max(
    gameState.currentBet * 2,
    gameState.currentBet + gameState.bigBlind
  );
};
