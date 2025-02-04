import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../hooks/reduxHooks';
import { RootState } from '../store';
import { PlayerComponent } from './PlayerComponent';
import { PlayingCard } from './PlayingCard';
import { GameAnalysis } from './GameAnalysis';
import { ShowdownResults } from './HandEvaluation';
import { BetSlider } from './BetSlider';
import { playerAction, setActivePlayer, dealCards, dealCommunityCards, setPhase, makeAIDecision } from '../store/gameSlice';
import { createDeck, evaluateHand, compareHands } from '../utils/poker';
import { validateAction, calculateMinRaise } from '../utils/betting';
import { Card, Player, PlayerAction } from '../types';
import { toast } from 'react-toastify';

export const PokerTable: React.FC = () => {
  const dispatch = useAppDispatch();
  const gameState = useSelector((state: RootState) => state.game);
  const [roundHistory, setRoundHistory] = useState<string[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showShowdown, setShowShowdown] = useState(false);
  const [showBetSlider, setShowBetSlider] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for OpenAI API key in environment
    if (!process.env.REACT_APP_OPENAI_API_KEY) {
      setError('No OpenAI API key found. Please set REACT_APP_OPENAI_API_KEY in your environment.');
      return;
    }
    initializeGame();
  }, []);

  const initializeGame = () => {
    try {
      const deck = createDeck();
      const initialCards: Record<string, Card[]> = {};
      let remainingDeck = [...deck];

      // Deal two cards to each player
      gameState.players.forEach(player => {
        const playerCards = remainingDeck.splice(0, 2);
        initialCards[player.id] = playerCards;
      });

      // Set up initial game state
      dispatch(dealCards({ playerCards: initialCards, deck: remainingDeck }));

      // Set first player after big blind to act
      const startingPlayerIndex = (gameState.bigBlindPosition + 1) % gameState.players.length;
      dispatch(setActivePlayer(gameState.players[startingPlayerIndex].id));
      dispatch(setPhase('preflop'));

      setRoundHistory(['Game started - dealing cards']);

      // If first player is AI, trigger their action
      const startingPlayer = gameState.players[startingPlayerIndex];
      if (startingPlayer.isAI) {
        handleAITurn(startingPlayer.id);
      }
    } catch (error) {
      console.error('Error initializing game:', error);
      setError('Failed to initialize game. Please try again.');
    }
  };

  const handleAITurn = async (playerId: string) => {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player || !player.isAI) return;

    try {
      await dispatch(makeAIDecision(playerId));
      const nextPlayer = findNextActivePlayer(playerId);
      if (nextPlayer) {
        dispatch(setActivePlayer(nextPlayer.id));
        if (nextPlayer.isAI) {
          // Add slight delay for better UX
          setTimeout(() => handleAITurn(nextPlayer.id), 1000);
        }
      } else {
        advancePhase();
      }
    } catch (error) {
      console.error('Error in AI turn:', error);
      toast.error('Error processing AI turn');
    }
  };

  const findNextActivePlayer = (currentPlayerId: string): Player | null => {
    const currentIndex = gameState.players.findIndex(p => p.id === currentPlayerId);
    let nextIndex = (currentIndex + 1) % gameState.players.length;
    
    // Loop through players until we find one that hasn't folded
    while (nextIndex !== currentIndex) {
      const nextPlayer = gameState.players[nextIndex];
      if (nextPlayer.cards.length > 0) {
        return nextPlayer;
      }
      nextIndex = (nextIndex + 1) % gameState.players.length;
    }
    return null;
  };

  const handlePlayerAction = async (actionType: PlayerAction, amount?: number) => {
    try {
      const currentPlayer = gameState.players.find(p => p.id === gameState.activePlayer);
      if (!currentPlayer) return;

      // Validate action
      const validation = validateAction(actionType, amount, currentPlayer, gameState);
      if (!validation.isValid) {
        toast.error(validation.error || 'Invalid action');
        return;
      }

      // Record action in history
      setRoundHistory(prev => [
        ...prev,
        `${currentPlayer.name} ${actionType}${amount ? ` $${amount}` : ''}`
      ]);

      // Dispatch action
      dispatch(playerAction({
        playerId: currentPlayer.id,
        actionType,
        amount
      }));

      // Find next player
      const nextPlayer = findNextActivePlayer(currentPlayer.id);

      if (nextPlayer) {
        dispatch(setActivePlayer(nextPlayer.id));
        // If next player is AI, trigger their action
        if (nextPlayer.isAI) {
          setTimeout(() => handleAITurn(nextPlayer.id), 1000);
        }
      } else {
        advancePhase();
      }
    } catch (error) {
      console.error('Error handling player action:', error);
      toast.error('Failed to process action. Please try again.');
    }
  };

  const advancePhase = () => {
    try {
      switch (gameState.currentPhase) {
        case 'setup':
          dispatch(setPhase('preflop'));
          break;
        case 'preflop':
          dispatch(dealCommunityCards(gameState.deck.slice(0, 3)));
          dispatch(setPhase('flop'));
          break;
        case 'flop':
          dispatch(dealCommunityCards([...gameState.communityCards, gameState.deck[3]]));
          dispatch(setPhase('turn'));
          break;
        case 'turn':
          dispatch(dealCommunityCards([...gameState.communityCards, gameState.deck[4]]));
          dispatch(setPhase('river'));
          break;
        case 'river':
          dispatch(setPhase('showdown'));
          handleShowdown();
          break;
      }

      // Set first active player for the new phase
      if (gameState.currentPhase !== 'river') {
        const firstPlayer = findFirstToActInNewPhase();
        if (firstPlayer) {
          dispatch(setActivePlayer(firstPlayer.id));
          if (firstPlayer.isAI) {
            setTimeout(() => handleAITurn(firstPlayer.id), 1000);
          }
        }
      }
    } catch (error) {
      console.error('Error advancing game phase:', error);
      toast.error('Failed to advance game phase.');
    }
  };

  const findFirstToActInNewPhase = (): Player | null => {
    // Start with player after dealer
    let startIndex = (gameState.dealerPosition + 1) % gameState.players.length;
    const firstActivePlayers = gameState.players
      .filter(p => p.cards.length > 0) // Only players who haven't folded
      .sort((a, b) => {
        // Sort by position relative to dealer
        const posA = (a.position - startIndex + gameState.players.length) % gameState.players.length;
        const posB = (b.position - startIndex + gameState.players.length) % gameState.players.length;
        return posA - posB;
      });

    return firstActivePlayers[0] || null;
  };

  const handleShowdown = () => {
    setShowShowdown(true);

    // Determine the winner
    const activePlayers = gameState.players.filter(p => p.cards.length > 0);
    let winner = activePlayers[0];
    for (let i = 1; i < activePlayers.length; i++) {
      const comparison = compareHands(
        winner.cards,
        activePlayers[i].cards,
        gameState.communityCards
      );
      if (comparison < 0) {
        winner = activePlayers[i];
      }
    }

    // Add winner information to round history
    setRoundHistory(prev => [
      ...prev,
      `${winner.name} wins pot of $${gameState.pot} with ${evaluateHand(winner.cards, gameState.communityCards).rank}`
    ]);
  };

  const startNewRound = () => {
    try {
      setShowShowdown(false);
      initializeGame();
      setShowAnalysis(false);
      setRoundHistory([]);
      setError(null);
    } catch (error) {
      console.error('Error starting new round:', error);
      toast.error('Failed to start new round.');
    }
  };

  const handleRaise = () => {
    const currentPlayer = gameState.players.find(p => p.id === gameState.activePlayer);
    if (!currentPlayer) return;

    // Calculate minimum raise amount
    const minRaise = Math.max(gameState.currentBet * 2, gameState.currentBet + gameState.bigBlind);
    const maxRaise = currentPlayer.chips;

    if (maxRaise < minRaise) {
      toast.error("Not enough chips to raise");
      return;
    }

    setBetAmount(minRaise);
    setShowBetSlider(true);
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Restart Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-poker-table">
      {/* Players */}
      <div className="absolute inset-0">
        {gameState.players.map((player, index) => (
          <PlayerComponent
            key={player.id}
            player={player}
            isActive={player.id === gameState.activePlayer}
            position={index}
            totalPlayers={gameState.players.length}
            currentBet={gameState.currentBet}
            isDealer={player.position === gameState.dealerPosition}
            isSmallBlind={player.position === gameState.smallBlindPosition}
            isBigBlind={player.position === gameState.bigBlindPosition}
          />
        ))}
      </div>

      {/* Community Cards */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="flex gap-2">
          {gameState.communityCards.map((card, index) => (
            <PlayingCard key={index} card={card} />
          ))}
        </div>
      </div>

      {/* Pot */}
      <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 text-white text-2xl font-bold">
        Pot: ${gameState.pot}
      </div>

      {/* Action Buttons */}
      {gameState.activePlayer === 'human' && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
          <button
            onClick={() => handlePlayerAction('fold')}
            className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700"
          >
            Fold
          </button>
          {gameState.currentBet === 0 ? (
            <button
              onClick={() => handlePlayerAction('check')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Check
            </button>
          ) : (
            <button
              onClick={() => handlePlayerAction('call')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Call ${gameState.currentBet - (gameState.players.find(p => p.id === 'human')?.currentBet || 0)}
            </button>
          )}
          <button
            onClick={() => handleRaise()}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
            disabled={gameState.players.find(p => p.id === 'human')?.chips === 0}
          >
            Raise
          </button>
        </div>
      )}

      {/* Bet Slider */}
      {showBetSlider && (
        <BetSlider
          minBet={Math.max(gameState.currentBet * 2, gameState.currentBet + gameState.bigBlind)}
          maxBet={gameState.players.find(p => p.id === gameState.activePlayer)?.chips || 0}
          currentBet={gameState.currentBet}
          onBetConfirm={(amount) => {
            handlePlayerAction('raise', amount);
            setShowBetSlider(false);
          }}
          onCancel={() => setShowBetSlider(false)}
        />
      )}

      {/* Showdown Results */}
      {showShowdown && (
        <ShowdownResults
          players={gameState.players.filter(p => p.cards.length > 0)}
          communityCards={gameState.communityCards}
          onClose={() => {
            setShowShowdown(false);
            setShowAnalysis(true);
          }}
        />
      )}

      {/* Game Analysis Modal */}
      {showAnalysis && (
        <GameAnalysis
          roundHistory={roundHistory}
          onClose={() => {
            setShowAnalysis(false);
            startNewRound();
          }}
        />
      )}

      {/* Game Phase Indicator */}
      <div className="absolute top-4 left-4 text-white text-lg">
        <div>Phase: {gameState.currentPhase}</div>
        <div className="text-sm mt-2">
          Round History:
          <div className="max-h-32 overflow-y-auto">
            {roundHistory.map((action, index) => (
              <div key={index} className="text-gray-300">{action}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
