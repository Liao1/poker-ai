import React from 'react';
import { Card, Player, HandRank } from '../types';
import { evaluateHand, compareHands } from '../utils/poker';

interface ShowdownResultsProps {
  players: Player[];
  communityCards: Card[];
  onClose: () => void;
}

const CardDisplay: React.FC<{ card: Card; isHighlighted?: boolean }> = ({ card, isHighlighted }) => (
  <div
    className={`
      w-12 h-16 rounded-md flex items-center justify-center font-bold
      ${card.suit === '♥' || card.suit === '♦' ? 'text-red-600' : 'text-black'}
      ${isHighlighted ? 'bg-yellow-50 border-2 border-yellow-400' : 'bg-white border border-gray-300'}
    `}
  >
    {card.rank}
    {card.suit}
  </div>
);

export const ShowdownResults: React.FC<ShowdownResultsProps> = ({
  players,
  communityCards,
  onClose
}) => {
  // Evaluate and sort hands
  const results = players
    .map(player => ({
      player,
      handRank: evaluateHand(player.cards, communityCards)
    }))
    .sort((a, b) => compareHands(b.handRank, a.handRank));

  // Find tied winners
  const winners = results.filter(r => 
    compareHands(r.handRank, results[0].handRank) === 0
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full">
        <h2 className="text-2xl font-bold mb-6">Showdown Results</h2>

        <div className="space-y-6">
          {results.map(({ player, handRank }, index) => {
            const isWinner = compareHands(handRank, results[0].handRank) === 0;
            const isSplitPot = winners.length > 1 && isWinner;

            return (
              <div
                key={player.id}
                className={`p-4 rounded-lg ${
                  isWinner
                    ? 'bg-yellow-50 border-2 border-yellow-400'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-lg">
                    {player.name}
                    {isWinner && (isSplitPot ? ' (Split Pot)' : ' (Winner)')}
                  </span>
                  <div className="text-right">
                    <div className="font-medium text-lg">{handRank.rank}</div>
                    {handRank.kickers.length > 0 && (
                      <div className="text-sm text-gray-600">
                        Kickers: {handRank.kickers.map(k => `${k.rank}${k.suit}`).join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Hole cards */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium w-20">Hole Cards:</span>
                    <div className="flex gap-2">
                      {player.cards.map((card, idx) => (
                        <CardDisplay
                          key={idx}
                          card={card}
                          isHighlighted={handRank.cards.includes(card)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Community cards */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium w-20">Board:</span>
                    <div className="flex gap-2">
                      {communityCards.map((card, idx) => (
                        <CardDisplay
                          key={idx}
                          card={card}
                          isHighlighted={handRank.cards.includes(card)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Best five cards */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium w-20">Best Hand:</span>
                    <div className="flex gap-2">
                      {handRank.cards.map((card, idx) => (
                        <CardDisplay
                          key={idx}
                          card={card}
                          isHighlighted={true}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
