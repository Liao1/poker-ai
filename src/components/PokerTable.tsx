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
  const [showContinueButton, setShowContinueButton] = useState(false);

  useEffect(() => {
    // Check for OpenAI API key in environment
    if (!process.env.REACT_APP_OPENAI_API_KEY) {
      setError('No OpenAI API key found. Please set REACT_APP_OPENAI_API_KEY in your environment.');
      return;
    }
    initializeGame();
  }, []);

  // Effect to handle AI turns when active player changes
  useEffect(() => {
    if (gameState.activePlayer) {
      const currentPlayer = gameState.players.find(p => p.id === gameState.activePlayer);
      if (currentPlayer?.isAI && !gameState.aiDecisionInProgress && !gameState.bettingRoundComplete) {
        // Add a small delay for better UX
        setTimeout(() => handleAITurn(currentPlayer.id), 1000);
      }
    }
  }, [gameState.activePlayer]);

  const findNextPlayerByPosition = (startPosition: number): Player | null => {
    let currentPosition = startPosition;
    let count = 0;

    // Loop through positions until we find an active player or complete a full circle
    while (count < gameState.players.length) {
      // Find player at current position
      const player = gameState.players.find(p => 
        p.position === currentPosition && 
        p.cards.length > 0 && 
        gameState.activePlayersInRound.includes(p.id)
      );

      if (player) {
        return player;
      }

      // Move to next position
      currentPosition = (currentPosition + 1) % gameState.players.length;
      count++;
    }

    return null;
  };

  const initializeGame = () => {
    try {
      // Create and shuffle deck
      const deck = createDeck();
      const shuffledDeck = [...deck].sort(() => Math.random() - 0.5);
      
      // Pre-determine all hole cards
      const initialCards: Record<string, Card[]> = {};
      let currentDeck = [...shuffledDeck];
      
      // Deal two cards to each player in order
      for (let i = 0; i < gameState.players.length; i++) {
        const player = gameState.players[i];
        const playerCards = [currentDeck.pop()!, currentDeck.pop()!];
        initialCards[player.id] = playerCards;
      }

      // Set up initial game state with remaining deck
      dispatch(dealCards({ playerCards: initialCards, deck: currentDeck }));

      // Set first player after big blind to act
      const firstPlayer = findNextPlayerByPosition((gameState.bigBlindPosition + 1) % gameState.players.length);
      if (firstPlayer) {
        dispatch(setActivePlayer(firstPlayer.id));
      }
      dispatch(setPhase('preflop'));

      setRoundHistory(['Game started - dealing cards']);
    } catch (error) {
      console.error('Error initializing game:', error);
      setError('Failed to initialize game. Please try again.');
    }
  };

  const handleAITurn = async (playerId: string) => {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player || !player.isAI) return;

    try {
      // Wait for the AI decision to complete
      await dispatch(makeAIDecision(playerId));
      
      // Check if betting round is complete after AI action
      if (gameState.bettingRoundComplete) {
        advancePhase();
      }
    } catch (error) {
      console.error('Error in AI turn:', error);
      toast.error('Error processing AI turn');
    }
  };

  const findNextActivePlayer = (currentPlayerId: string): Player | null => {
    const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
    if (!currentPlayer) return null;

    return findNextPlayerByPosition((currentPlayer.position + 1) % gameState.players.length);
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

      // Find and set next player
      const nextPlayer = findNextActivePlayer(currentPlayer.id);
      if (nextPlayer) {
        dispatch(setActivePlayer(nextPlayer.id));
      } else {
        advancePhase();
      }
    } catch (error) {
      console.error('Error handling player action:', error);
      toast.error('Failed to process action. Please try again.');
    }
  };

  const advancePhase = async () => {
    try {
      // Add delay for better UX
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      switch (gameState.currentPhase) {
        case 'setup':
          dispatch(setPhase('preflop'));
          break;
          
        case 'preflop':
          // Show flop animation
          setRoundHistory(prev => [...prev, '--- Dealing Flop ---']);
          await delay(500);
          dispatch(dealCommunityCards(gameState.deck.slice(0, 3)));
          dispatch(setPhase('flop'));
          break;
          
        case 'flop':
          // Show turn animation
          setRoundHistory(prev => [...prev, '--- Dealing Turn ---']);
          await delay(500);
          dispatch(dealCommunityCards([...gameState.communityCards, gameState.deck[3]]));
          dispatch(setPhase('turn'));
          break;
          
        case 'turn':
          // Show river animation
          setRoundHistory(prev => [...prev, '--- Dealing River ---']);
          await delay(500);
          dispatch(dealCommunityCards([...gameState.communityCards, gameState.deck[4]]));
          dispatch(setPhase('river'));
          break;
          
        case 'river':
          setRoundHistory(prev => [...prev, '--- Showdown ---']);
          await delay(500);
          dispatch(setPhase('showdown'));
          handleShowdown();
          return; // Don't set next player after showdown
      }

      // Reset betting state for next phase
      dispatch(playerAction({
        playerId: 'reset',
        actionType: 'check',
        amount: 0
      }));

      // Find first player to act based on phase
      // In preflop, first to act is after big blind
      // In other phases, first to act is after dealer
      const startPosition = gameState.currentPhase === 'preflop' ? 
        (gameState.bigBlindPosition + 1) % gameState.players.length : 
        (gameState.dealerPosition + 1) % gameState.players.length;

      const firstPlayer = findNextPlayerByPosition(startPosition);
      if (firstPlayer) {
        dispatch(setActivePlayer(firstPlayer.id));
      }
    } catch (error) {
      console.error('Error advancing game phase:', error);
      toast.error('Failed to advance game phase.');
    }
  };

  const handleShowdown = () => {
    // First show all hole cards
    setRoundHistory(prev => [
      ...prev,
      '--- All players show their cards ---'
    ]);

    // Determine the winner
    const activePlayers = gameState.players.filter(p => p.cards.length > 0);
    const playerHands = activePlayers.map(player => ({
      player,
      handRank: evaluateHand(player.cards, gameState.communityCards)
    }));

    // Sort players by hand rank
    playerHands.sort((a, b) => compareHands(b.handRank, a.handRank));

    // Check for split pot
    const winners = playerHands.filter(ph => 
      compareHands(ph.handRank, playerHands[0].handRank) === 0
    );

    if (winners.length > 1) {
      // Split pot
      const splitAmount = Math.floor(gameState.pot / winners.length);
      const winnerNames = winners.map(w => w.player.name).join(' and ');
      setRoundHistory(prev => [
        ...prev,
        `Split pot: ${winnerNames} each win $${splitAmount} with ${winners[0].handRank.rank}`
      ]);
    } else {
      // Single winner
      const winner = winners[0];
      setRoundHistory(prev => [
        ...prev,
        `${winner.player.name} wins pot of $${gameState.pot} with ${winner.handRank.rank}`
      ]);
    }

    // Show the showdown results after a short delay
    setTimeout(() => {
      setShowShowdown(true);
      setShowContinueButton(true);
    }, 1000);
  };

  const handleContinue = () => {
    setShowShowdown(false);
    setShowContinueButton(false);
    setShowAnalysis(false);
    initializeGame();
    setRoundHistory([]);
  };

  const isLastToAct = (playerId: string): boolean => {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return false;

    // Get the next active player after this one
    const nextPlayer = findNextActivePlayer(playerId);
    if (!nextPlayer) return true;

    // Check if all active players have matched the current bet
    const allBetsMatched = gameState.activePlayersInRound.every(id => {
      const p = gameState.players.find(p => p.id === id);
      return p && p.currentBet === gameState.currentBet;
    });

    return allBetsMatched;
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
            showCards={gameState.currentPhase === 'showdown' && player.cards.length > 0}
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
          {(gameState.currentBet === 0 || 
            (isLastToAct('human') && 
             gameState.players.find(p => p.id === 'human')?.currentBet === gameState.currentBet)) ? (
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

      {/* Continue Button */}
      {showContinueButton && !showShowdown && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <button
            onClick={handleContinue}
            className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 text-lg font-semibold"
          >
            Continue to Next Game
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
            setShowContinueButton(true);
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
