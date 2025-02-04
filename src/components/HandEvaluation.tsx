import React from 'react';
import { Card, Player } from '../types';
import { evaluateHand } from '../utils/poker';

interface ShowdownResultsProps {
  players: Player[];
  communityCards: Card[];
  onClose: () => void;
}

export const ShowdownResults: React.FC<ShowdownResultsProps> = ({
  players,
  communityCards,
  onClose
}) => {
  const results = players.map(player => ({
    player,
    handRank: evaluateHand(player.cards, communityCards)
  })).sort((a, b) => b.handRank.value - a.handRank.value);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-6">Showdown Results</h2>

        <div className="space-y-4">
          {results.map(({ player, handRank }, index) => (
            <div
              key={player.id}
              className={`p-4 rounded-lg ${
                index === 0
                  ? 'bg-yellow-100 border-2 border-yellow-500'
                  : 'bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">
                  {player.name}
                  {index === 0 && ' (Winner)'}
                </span>
                <span className="text-sm font-medium text-gray-600">
                  {handRank.rank}
                </span>
              </div>

              <div className="flex gap-2">
                <div className="flex gap-1">
                  {player.cards.map((card, idx) => (
                    <div
                      key={idx}
                      className={`
                        w-12 h-16 rounded-md flex items-center justify-center font-bold
                        ${card.suit === '♥' || card.suit === '♦' ? 'text-red-600' : 'text-black'}
                        bg-white border border-gray-300
                      `}
                    >
                      {card.rank}
                      {card.suit}
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  {communityCards.map((card, idx) => (
                    <div
                      key={idx}
                      className={`
                        w-12 h-16 rounded-md flex items-center justify-center font-bold
                        ${card.suit === '♥' || card.suit === '♦' ? 'text-red-600' : 'text-black'}
                        bg-gray-50 border border-gray-300
                      `}
                    >
                      {card.rank}
                      {card.suit}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
