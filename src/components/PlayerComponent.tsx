import React from 'react';
import { Player } from '../types';
import { CardHand } from './PlayingCard';

interface PlayerComponentProps {
  player: Player;
  isActive: boolean;
  position: number;
  totalPlayers: number;
  currentBet: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  showCards?: boolean; // Add this prop to control card visibility
}

export const PlayerComponent: React.FC<PlayerComponentProps> = ({
  player,
  isActive,
  position,
  totalPlayers,
  currentBet,
  isDealer,
  isSmallBlind,
  isBigBlind,
  showCards = false
}) => {
  // Calculate player position around the table
  const getPlayerPosition = (pos: number, total: number) => {
    if (pos === 0) {
      // Human player always at bottom middle
      return { left: '50%', top: '85%' };
    }

    // For AI players, line them up horizontally at the top
    // Calculate spacing between AI players
    const aiPlayers = total - 1; // Subtract human player
    const totalWidth = 80; // Use 80% of screen width
    const spacing = totalWidth / (aiPlayers + 1); // +1 to add spacing at edges
    const startX = (100 - totalWidth) / 2; // Start from this % from left edge
    
    // Calculate the horizontal position
    const xPosition = startX + (spacing * pos);
    
    return { 
      left: `${xPosition}%`,
      top: '15%' // Fixed distance from top
    };
  };

  const { left, top } = getPlayerPosition(player.position, totalPlayers);

  const getPersonalityColor = (personality?: string) => {
    switch (personality) {
      case 'aggressive':
        return 'bg-red-100 border-red-400';
      case 'conservative':
        return 'bg-blue-100 border-blue-400';
      case 'mathematical':
        return 'bg-purple-100 border-purple-400';
      case 'unpredictable':
        return 'bg-yellow-100 border-yellow-400';
      default:
        return 'bg-gray-100 border-gray-400';
    }
  };

  return (
    <div
      className={`
        absolute
        transform -translate-x-1/2 -translate-y-1/2
        ${isActive ? 'z-20' : 'z-10'}
        transition-all duration-300
      `}
      style={{
        left,
        top,
        transform: `translate(-50%, -50%) scale(${totalPlayers > 6 ? 0.85 : 1})` // Scale down if many players
      }}
    >
      <div
        className={`
          relative
          p-4 rounded-lg
          ${isActive ? 'ring-2 ring-yellow-400 shadow-lg' : ''}
          ${getPersonalityColor(player.personality)}
          transition-all duration-300
          border
        `}
      >
        {/* Position markers */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 flex gap-2">
          {isDealer && (
            <div className="px-2 py-1 bg-white text-black text-xs rounded-full border border-black">
              D
            </div>
          )}
          {isSmallBlind && (
            <div className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
              SB
            </div>
          )}
          {isBigBlind && (
            <div className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
              BB
            </div>
          )}
        </div>

        {/* Player name and chips */}
        <div className="text-center mb-2">
          <div className="font-bold text-gray-800">
            {player.name}
            {player.personality && (
              <span className="ml-2 text-xs font-normal text-gray-500">
                ({player.personality})
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            Chips: {player.chips}
          </div>
        </div>

        {/* Current bet indicator */}
        {player.currentBet > 0 && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="bg-green-600 text-white text-sm px-2 py-1 rounded-full shadow">
              Bet: {player.currentBet}
            </div>
          </div>
        )}

        {/* Cards */}
        <div className="mt-2">
          <CardHand
            cards={player.cards}
            isHidden={player.isAI && !showCards}
            isActive={isActive}
          />
        </div>

        {/* Action Required Indicator */}
        {isActive && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <div className="animate-bounce">
              <div className="w-4 h-4 bg-yellow-400 rounded-full shadow" />
            </div>
          </div>
        )}

        {/* Need to Call Indicator */}
        {currentBet > player.currentBet && !isActive && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow">
              To Call: {currentBet - player.currentBet}
            </div>
          </div>
        )}

        {/* Personality Badge */}
        {player.personality && (
          <div className="absolute -top-1 -right-1">
            <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{
              backgroundColor: {
                aggressive: '#ef4444',
                conservative: '#3b82f6',
                mathematical: '#8b5cf6',
                unpredictable: '#f59e0b',
                balanced: '#6b7280'
              }[player.personality]
            }} />
          </div>
        )}
      </div>
    </div>
  );
};
